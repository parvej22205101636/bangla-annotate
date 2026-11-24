import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { Project } from '../models/Project.js';
import { Item } from '../models/Item.js';
import { Annotation } from '../models/Annotation.js';
import { User } from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { parseItemsCsv, toCsv } from '../utils/csv.js';
import { cohenKappa, describeKappa, majorityLabel } from '../utils/agreement.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const COLORS = ['#0f766e', '#b91c1c', '#7c3aed', '#c2410c', '#1d4ed8', '#a16207', '#be185d', '#15803d', '#475569'];

router.use(requireAuth);

const isId = (id) => mongoose.isValidObjectId(id);

// Loads the project and checks that the current user may see it.
async function loadProject(req, res, next) {
  if (!isId(req.params.id)) return res.status(404).json({ message: 'Project not found' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  const uid = String(req.user._id);
  const allowed = String(project.owner) === uid || project.members.some((m) => String(m) === uid);
  if (!allowed) return res.status(403).json({ message: 'You are not a member of this project' });
  req.project = project;
  next();
}

function onlyOwner(req, res, next) {
  if (String(req.project.owner) !== String(req.user._id)) return res.status(403).json({ message: 'Only the project owner can do this' });
  next();
}

async function progress(project, userId) {
  const [total, done, mine] = await Promise.all([
    Item.countDocuments({ project: project._id }),
    Item.countDocuments({ project: project._id, done: true }),
    Annotation.countDocuments({ project: project._id, user: userId }),
  ]);
  return { total, done, mine };
}

// List projects: admins see the ones they own, annotators the ones they are members of.
router.get('/', async (req, res) => {
  const filter = req.user.role === 'admin' ? { owner: req.user._id } : { members: req.user._id };
  const projects = await Project.find(filter).sort({ createdAt: -1 }).lean();
  const result = await Promise.all(projects.map(async (p) => ({ ...p, progress: await progress(p, req.user._id) })));
  res.json({ projects: result });
});

router.post('/', requireAdmin, async (req, res) => {
  const names = (Array.isArray(req.body.labels) ? req.body.labels : String(req.body.labels || '').split(','))
    .map((l) => String(l).trim())
    .filter(Boolean);
  const unique = [...new Set(names)];
  if (unique.length !== names.length) return res.status(400).json({ message: 'Label names must be different' });

  try {
    const project = await Project.create({
      name: req.body.name,
      description: req.body.description,
      annotationsPerItem: Number(req.body.annotationsPerItem) || 2,
      labels: unique.map((name, i) => ({ name, color: COLORS[i % COLORS.length] })),
      owner: req.user._id,
      members: [req.user._id],
    });
    res.status(201).json({ project });
  } catch (err) {
    res.status(400).json({ message: err.errors ? Object.values(err.errors)[0].message : 'Could not create project' });
  }
});

router.get('/:id', loadProject, async (req, res) => {
  await req.project.populate('members', 'name email role');
  res.json({ project: req.project, progress: await progress(req.project, req.user._id) });
});

router.delete('/:id', loadProject, onlyOwner, async (req, res) => {
  await Promise.all([Annotation.deleteMany({ project: req.project._id }), Item.deleteMany({ project: req.project._id })]);
  await req.project.deleteOne();
  res.json({ ok: true });
});

// ---- items ----
router.post('/:id/items', loadProject, onlyOwner, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a CSV file' });
  let rows;
  try {
    rows = parseItemsCsv(req.file.buffer.toString('utf8'), req.body.textColumn);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  await Item.insertMany(rows.map((r) => ({ ...r, project: req.project._id })));
  res.status(201).json({ added: rows.length });
});

// ---- members ----
router.post('/:id/members', loadProject, onlyOwner, async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase().trim() });
  if (!user) return res.status(404).json({ message: 'No account with this e-mail. Ask them to register first.' });
  await Project.updateOne({ _id: req.project._id }, { $addToSet: { members: user._id } });
  res.json({ member: user.toPublic() });
});

router.delete('/:id/members/:userId', loadProject, onlyOwner, async (req, res) => {
  if (req.params.userId === String(req.project.owner)) return res.status(400).json({ message: 'The owner cannot be removed' });
  await Project.updateOne({ _id: req.project._id }, { $pull: { members: req.params.userId } });
  res.json({ ok: true });
});

// ---- annotating ----
// Next item this user has not labelled yet, among items that still need labels.
router.get('/:id/next', loadProject, async (req, res) => {
  const labelled = await Annotation.distinct('item', { project: req.project._id, user: req.user._id });
  const item = await Item.findOne({ project: req.project._id, done: false, _id: { $nin: labelled } })
    .sort({ annotationCount: -1, _id: 1 }) // finish half-labelled items first
    .select('text externalId');
  const remaining = await Item.countDocuments({ project: req.project._id, done: false, _id: { $nin: labelled } });
  res.json({ item, remaining });
});

router.post('/:id/annotations', loadProject, async (req, res) => {
  const { itemId, label } = req.body;
  if (!req.project.labels.some((l) => l.name === label)) return res.status(400).json({ message: 'Unknown label' });
  if (!isId(itemId)) return res.status(400).json({ message: 'Unknown item' });

  const item = await Item.findOne({ _id: itemId, project: req.project._id });
  if (!item) return res.status(404).json({ message: 'Item not found' });

  try {
    await Annotation.create({ project: req.project._id, item: item._id, user: req.user._id, label });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'You already labelled this item' });
    throw err;
  }
  const updated = await Item.findByIdAndUpdate(item._id, { $inc: { annotationCount: 1 } }, { new: true });
  if (updated.annotationCount >= req.project.annotationsPerItem && !updated.done) {
    await Item.updateOne({ _id: item._id }, { done: true });
  }
  res.status(201).json({ ok: true });
});

// ---- stats & export (owner only) ----
async function labelsByItem(projectId) {
  const annotations = await Annotation.find({ project: projectId }).select('item user label').lean();
  const map = new Map();
  for (const a of annotations) {
    const key = String(a.item);
    if (!map.has(key)) map.set(key, new Map());
    map.get(key).set(String(a.user), a.label);
  }
  return { annotations, map };
}

router.get('/:id/stats', loadProject, onlyOwner, async (req, res) => {
  const project = await req.project.populate('members', 'name email');
  const [total, done] = await Promise.all([
    Item.countDocuments({ project: project._id }),
    Item.countDocuments({ project: project._id, done: true }),
  ]);
  const { annotations, map } = await labelsByItem(project._id);

  const labelCounts = Object.fromEntries(project.labels.map((l) => [l.name, 0]));
  const perUser = new Map();
  for (const a of annotations) {
    labelCounts[a.label] = (labelCounts[a.label] || 0) + 1;
    perUser.set(String(a.user), (perUser.get(String(a.user)) || 0) + 1);
  }
  const annotators = project.members
    .map((m) => ({ id: m._id, name: m.name, email: m.email, count: perUser.get(String(m._id)) || 0 }))
    .sort((a, b) => b.count - a.count);

  // Agreement: every pair of annotators on the items both of them labelled.
  const pairs = [];
  const ids = annotators.filter((a) => a.count > 0).map((a) => String(a.id));
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const shared = [];
      for (const labels of map.values()) {
        if (labels.has(ids[i]) && labels.has(ids[j])) shared.push([labels.get(ids[i]), labels.get(ids[j])]);
      }
      if (shared.length > 0) {
        const k = cohenKappa(shared);
        pairs.push({
          a: annotators.find((x) => String(x.id) === ids[i]).name,
          b: annotators.find((x) => String(x.id) === ids[j]).name,
          ...k,
          meaning: describeKappa(k.kappa),
        });
      }
    }
  }

  res.json({ total, done, annotations: annotations.length, labelCounts, annotators, agreement: pairs.sort((x, y) => y.n - x.n) });
});

router.get('/:id/export', loadProject, onlyOwner, async (req, res) => {
  const project = await req.project.populate('members', 'name');
  const names = new Map(project.members.map((m) => [String(m._id), m.name]));
  const items = await Item.find({ project: project._id }).sort({ _id: 1 }).lean();
  const { map } = await labelsByItem(project._id);

  const records = items.map((item) => {
    const labels = map.get(String(item._id)) || new Map();
    return {
      id: item.externalId || String(item._id),
      text: item.text,
      final_label: majorityLabel([...labels.values()]) || '',
      annotations: [...labels.entries()].map(([uid, l]) => `${names.get(uid) || uid}: ${l}`).join(' | '),
      done: item.done,
    };
  });

  const safeName = project.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() || 'project';
  if (req.query.format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.json"`);
    return res.json(records);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
  res.send(toCsv(records));
});

export default router;
