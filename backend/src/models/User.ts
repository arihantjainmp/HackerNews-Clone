import { Schema, model, Document, Types } from 'mongoose';

/**
 * User interface representing the user document structure
 */
export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
}

/**
 * User schema definition
 * Stores user account information with authentication credentials
 */
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [20, 'Username must not exceed 20 characters'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v: string): boolean {
        // Email format validation regex - more strict to reject invalid formats
        // Rejects: consecutive dots, spaces, missing @ or domain parts
        return /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v) && 
               !/\.\./.test(v) && // No consecutive dots
               !/\s/.test(v); // No spaces
      },
      message: 'Invalid email format'
    }
  },
  password_hash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

/**
 * User model
 * Handles user account data with unique username and email constraints
 */
export const User = model<IUser>('User', UserSchema);
