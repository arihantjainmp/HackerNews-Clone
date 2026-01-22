import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import { User } from '../src/models/User';
import { Post } from '../src/models/Post';
import { Comment } from '../src/models/Comment';
import { Vote } from '../src/models/Vote';
import { RefreshToken } from '../src/models/RefreshToken';
import { Notification } from '../src/models/Notification';

// Load environment variables
dotenv.config();

// --- CONFIGURATION ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hacker-news-clone';
const USER_COUNT = 10;
const POST_COUNT = 100;
const TOP_LEVEL_COMMENT_COUNT = 200;
const REPLY_COUNT = 150;
const VOTE_COUNT = 500;

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const seed = async () => {
  console.log('🌱 Starting Seed Process...');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ Connected to MongoDB at ${MONGODB_URI}`);

    // 1. HARD RESET (DROP DATABASE)
    console.log('🔥 Dropping existing database...');
    await mongoose.connection.db?.dropDatabase();
    console.log('✨ Database cleared.');

    // 2. CREATE USERS
    console.log(`👤 Creating ${USER_COUNT} Users...`);
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const userDocs = [];

    for (let i = 0; i < USER_COUNT; i++) {
      userDocs.push({
        username: faker.internet.username().substring(0, 20).replace(/[^a-zA-Z0-9]/g, '_'),
        email: faker.internet.email().toLowerCase(),
        password_hash: passwordHash,
        created_at: faker.date.past()
      });
    }
    
    // Use create instead of insertMany to trigger schema validation if needed
    const createdUsers = await User.create(userDocs);
    const userIds = createdUsers.map(u => u._id);
    console.log('✅ Users created');

    // 3. CREATE POSTS
    console.log(`📝 Creating ${POST_COUNT} Posts...`);
    const postDocs = [];

    for (let i = 0; i < POST_COUNT; i++) {
      const isLink = Math.random() > 0.3;
      const authorId = getRandomItem(userIds);
      
      postDocs.push({
        title: faker.lorem.sentence({ min: 3, max: 8 }).substring(0, 300),
        url: isLink ? faker.internet.url() : undefined,
        text: isLink ? undefined : faker.lorem.paragraphs(2),
        type: isLink ? 'link' : 'text',
        author_id: authorId,
        points: 0,
        comment_count: 0,
        created_at: faker.date.recent({ days: 30 })
      });
    }
    const createdPosts = await Post.create(postDocs);
    console.log('✅ Posts created');

    // 4. CREATE TOP LEVEL COMMENTS
    console.log(`💬 Creating ${TOP_LEVEL_COMMENT_COUNT} Top-level Comments...`);
    const topLevelComments = [];

    for (let i = 0; i < TOP_LEVEL_COMMENT_COUNT; i++) {
      const post = getRandomItem(createdPosts);
      const authorId = getRandomItem(userIds);
      const createdAt = faker.date.between({ from: post.created_at, to: new Date() });

      topLevelComments.push({
        content: faker.lorem.sentences({ min: 1, max: 3 }),
        post_id: post._id,
        parent_id: null,
        author_id: authorId,
        points: 0,
        created_at: createdAt,
        is_deleted: false
      });
    }
    const createdTopComments = await Comment.create(topLevelComments);
    console.log('✅ Top-level comments created');

    // 5. CREATE NESTED REPLIES
    console.log(`↪️  Creating ${REPLY_COUNT} Nested Replies...`);
    const allComments = [...createdTopComments];
    const replies = [];

    for (let i = 0; i < REPLY_COUNT; i++) {
      const parentComment = getRandomItem(allComments);
      const authorId = getRandomItem(userIds);
      const createdAt = faker.date.between({ from: parentComment.created_at, to: new Date() });

      const reply = await Comment.create({
        content: faker.lorem.sentences({ min: 1, max: 2 }),
        post_id: parentComment.post_id,
        parent_id: parentComment._id,
        author_id: authorId,
        points: 0,
        created_at: createdAt,
        is_deleted: false
      });
      
      allComments.push(reply);
      replies.push(reply);
    }
    console.log('✅ Nested replies created');

    // 6. UPDATE COMMENT COUNTS ON POSTS
    console.log('🔄 Updating Post comment counts...');
    const totalComments = [...createdTopComments, ...replies];
    const commentCounts: Record<string, number> = {};

    totalComments.forEach(c => {
      const pid = c.post_id.toString();
      commentCounts[pid] = (commentCounts[pid] || 0) + 1;
    });

    for (const postId of Object.keys(commentCounts)) {
      await Post.findByIdAndUpdate(postId, { comment_count: commentCounts[postId] });
    }
    console.log('✅ Comment counts updated');

    // 7. CREATE VOTES
    console.log(`🗳️  Casting ${VOTE_COUNT} Votes...`);
    const votes = [];
    const targets = [
      ...createdPosts.map(p => ({ id: p._id, type: 'post' })),
      ...totalComments.map(c => ({ id: c._id, type: 'comment' }))
    ];

    const voteTracker = new Set<string>();

    for (let i = 0; i < VOTE_COUNT; i++) {
      const user = getRandomItem(userIds);
      const target = getRandomItem(targets);
      const trackingKey = `${user.toString()}-${target.id.toString()}`;

      if (voteTracker.has(trackingKey)) continue;
      voteTracker.add(trackingKey);

      votes.push({
        user_id: user,
        target_id: target.id,
        target_type: target.type,
        direction: Math.random() > 0.1 ? 1 : -1
      });
    }

    await Vote.create(votes);
    console.log('✅ Votes created');

    // 8. UPDATE SCORES
    console.log('📊 Updating Scores...');
    const scoreMap: Record<string, number> = {};
    votes.forEach(v => {
      const tid = v.target_id.toString();
      scoreMap[tid] = (scoreMap[tid] || 0) + v.direction;
    });

    for (const post of createdPosts) {
      const score = scoreMap[post._id.toString()] || 0;
      await Post.findByIdAndUpdate(post._id, { points: score });
    }
    for (const comment of totalComments) {
      const score = scoreMap[comment._id.toString()] || 0;
      await Comment.findByIdAndUpdate(comment._id, { points: score });
    }
    console.log('✅ Scores updated');

    console.log('🚀 Seeding Completed Successfully!');
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Database disconnected');
    process.exit(0);
  }
};

seed();
