import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { NotFoundError } from '../utils/errors';

/**
 * Get user profile with recent activities
 * GET /api/users/:username
 */
export const getUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Find user by username
    const user = await User.findOne({ username }).select('-password_hash');

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Fetch user's posts with pagination
    const [posts, totalPosts] = await Promise.all([
      Post.find({ author_id: user._id })
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(skip)
        .populate('author_id', 'username email created_at')
        .lean(),
      Post.countDocuments({ author_id: user._id }),
    ]);

    // Fetch user's comments with pagination
    const [comments, totalComments] = await Promise.all([
      Comment.find({ author_id: user._id, is_deleted: false })
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(skip)
        .populate('author_id', 'username email created_at')
        .populate('post_id', 'title')
        .lean(),
      Comment.countDocuments({ author_id: user._id, is_deleted: false }),
    ]);

    // Transform posts to include author field
    const transformedPosts = posts.map((post: any) => ({
      ...post,
      author: post.author_id,
      author_id: post.author_id._id,
    }));

    // Transform comments to include author field
    const transformedComments = comments.map((comment: any) => ({
      ...comment,
      author: comment.author_id,
      author_id: comment.author_id._id,
    }));

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
      posts: transformedPosts,
      comments: transformedComments,
      totalPosts,
      totalComments,
      page,
      totalPages: Math.ceil(Math.max(totalPosts, totalComments) / limit),
    });
  } catch (error) {
    next(error);
  }
};
