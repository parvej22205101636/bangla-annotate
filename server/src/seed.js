// Fills the database with a demo admin, two annotators and a sample project.
// Usage: npm run seed   (uses ADMIN_EMAIL from .env for the admin account)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models/User.js';
import { Project } from './models/Project.js';
import { Item } from './models/Item.js';

// Made-up sample headlines, written only for this demo.
const SAMPLE = [
  'ঢাকায় আজ সন্ধ্যায় হালকা বৃষ্টির সম্ভাবনা, জানাল আবহাওয়া অফিস',
  'নতুন শিক্ষাবর্ষে বিনামূল্যে পাঠ্যবই বিতরণ শুরু হবে জানুয়ারির প্রথম দিনে',
  'চাঁদে বাংলাদেশি বিজ্ঞানীদের তৈরি শহর, শিগগিরই টিকিট বিক্রি শুরু',
  'মেট্রোরেলের নতুন স্টেশন চালু, যাত্রীদের ভিড় বেড়েছে',
  'এক গ্লাস লেবুর পানি খেলেই সব রোগ সেরে যাবে, দাবি ভাইরাল পোস্টে',
  'বাজারে কমেছে পেঁয়াজের দাম, স্বস্তিতে ক্রেতারা',
  'মোবাইল ফোন চার্জে রেখে কথা বললে ফোন বোমার মতো ফেটে যায়, সতর্ক করল অজানা সূত্র',
  'বিশ্ববিদ্যালয়ে ভর্তি পরীক্ষার ফল প্রকাশ, পাসের হার আগের বছরের চেয়ে বেশি',
  'শীতের শুরুতে হাসপাতালগুলোতে ঠান্ডাজনিত রোগীর সংখ্যা বাড়ছে',
  'আগামীকাল থেকে দেশের সব দোকান তিন মাস বন্ধ থাকবে, ছড়িয়ে পড়েছে গুজব',
  'জাতীয় ক্রিকেট দল সিরিজের প্রথম ম্যাচে জয় পেয়েছে',
  'নদীভাঙনে ঘরবাড়ি হারিয়েছে চরাঞ্চলের বহু পরিবার',
  'কলার খোসা দিয়ে বিদ্যুৎ তৈরি করে পুরো গ্রাম আলোকিত, দাবি অনলাইন পেজের',
  'সড়ক দুর্ঘটনা কমাতে মহাসড়কে নতুন গতিসীমা নির্ধারণ',
  'কৃত্রিম বুদ্ধিমত্তা দিয়ে লেখা হয়েছে এই খবরটি, এখানে কোনো সত্য তথ্য নেই',
  'বইমেলায় এবার শিশুদের জন্য আলাদা চত্বর থাকছে',
];

await mongoose.connect(config.mongoUri);
const hash = await bcrypt.hash('demo12345', 12);
const adminEmail = config.adminEmail || 'admin@example.com';

async function upsertUser(name, email, role) {
  return User.findOneAndUpdate({ email }, { name, email, role, passwordHash: hash }, { upsert: true, new: true });
}

const admin = await upsertUser('Demo Admin', adminEmail, 'admin');
const a1 = await upsertUser('Rahim', 'rahim@example.com', 'annotator');
const a2 = await upsertUser('Karim', 'karim@example.com', 'annotator');

await Project.deleteMany({ name: 'Demo: Bangla news check' });
const project = await Project.create({
  name: 'Demo: Bangla news check',
  description: 'Label each headline as real news, fake news or unsure.',
  labels: [
    { name: 'real', color: '#0f766e' },
    { name: 'fake', color: '#b91c1c' },
    { name: 'unsure', color: '#a16207' },
  ],
  annotationsPerItem: 2,
  owner: admin._id,
  members: [admin._id, a1._id, a2._id],
});
await Item.insertMany(SAMPLE.map((text, i) => ({ project: project._id, text, externalId: `demo-${i + 1}` })));

console.log(`Seeded. Log in as ${adminEmail}, rahim@example.com or karim@example.com with password: demo12345`);
await mongoose.disconnect();
