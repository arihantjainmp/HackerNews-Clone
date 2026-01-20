import { Schema, model, Document, Types } from 'mongoose';

/**
 * Post interface representing the post document structure
 */
export interface IPost extends Document {
  _id: Types.ObjectId;
  title: string;
  url?: string;
  text?: string;
  type: 'link' | 'text';
  author_id: Types.ObjectId;
  points: number;
  comment_count: number;
  created_at: Date;
}

/**
 * Post schema definition
 * Stores user-submitted posts with either URL (link) or text content
 */
const PostSchema = new Schema<IPost>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    minlength: [1, 'Title must be at least 1 character'],
    maxlength: [300, 'Title must not exceed 300 characters'],
    trim: true
  },
  url: {
    type: String,
    validate: {
      validator: function(v: string): boolean {
        // URL format validation - only validate if url is provided
        if (!v) return true;
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid URL format - must start with http:// or https://'
    }
  },
  text: {
    type: String,
    maxlength: [10000, 'Text must not exceed 10000 characters']
  },
  type: {
    type: String,
    enum: {
      values: ['link', 'text'],
      message: 'Type must be either "link" or "text"'
    }
  },
  author_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author ID is required'],
    index: true
  },
  points: {
    type: Number,
    default: 0
  },
  comment_count: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

/**
 * Pre-validation hook to set type based on url/text presence
 * and ensure exactly one of url or text is provided
 */
PostSchema.pre('validate', function(next) {
  const hasUrl = Boolean(this.url && this.url.trim());
  const hasText = Boolean(this.text && this.text.trim());
  
  // Validation: Must have exactly one of url or text
  if (hasUrl && hasText) {
    return next(new Error('Post must have either url or text, but not both'));
  }
  
  if (!hasUrl && !hasText) {
    return next(new Error('Post must have either url or text'));
  }
  
  // Set type based on which field is present
  this.type = hasUrl ? 'link' : 'text';
  
  next();
});

// Create indexes for efficient queries
PostSchema.index({ created_at: -1 });  // For "new" sorting (descending)
PostSchema.index({ points: -1 });      // For "top" sorting (descending)
PostSchema.index({ title: 'text' });   // Text index for search functionality

/**
 * Post model
 * Handles post submissions with either URL links or text content
 */
export const Post = model<IPost>('Post', PostSchema);
