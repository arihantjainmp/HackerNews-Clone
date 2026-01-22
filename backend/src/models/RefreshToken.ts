import { Schema, model, Document, Types } from 'mongoose';

/**
 * RefreshToken interface representing the refresh token document structure
 */
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  token: string;
  expires_at: Date;
  is_used: boolean;
  used_at?: Date;
  created_at: Date;
}

/**
 * RefreshToken schema definition
 * Stores refresh tokens for JWT authentication with expiration and usage tracking
 */
const RefreshTokenSchema = new Schema<IRefreshToken>({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
  },
  expires_at: {
    type: Date,
    required: [true, 'Expiration date is required'],
  },
  is_used: {
    type: Boolean,
    default: false,
  },
  used_at: {
    type: Date,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Unique index on token field for fast lookup and duplicate prevention
RefreshTokenSchema.index({ token: 1 }, { unique: true });

// Index on expires_at for cleanup queries (removing expired tokens)
RefreshTokenSchema.index({ expires_at: 1 });

/**
 * RefreshToken model
 * Handles refresh token storage with expiration tracking and usage prevention
 */
export const RefreshToken = model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
