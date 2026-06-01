import mongoose, { Schema, Document } from 'mongoose'

export interface IAnswer {
  _id?: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  text: string
  helpful: number
  isSeller: boolean
  isAdmin: boolean
  createdAt: Date
}

export interface IProductQA extends Document {
  product: mongoose.Types.ObjectId
  user: mongoose.Types.ObjectId
  question: string
  answers: IAnswer[]
  isAnswered: boolean
  isApproved: boolean
  isFlagged: boolean
  viewCount: number
  createdAt: Date
}

const AnswerSchema = new Schema<IAnswer>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, trim: true },
  helpful: { type: Number, default: 0 },
  isSeller: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

const ProductQASchema = new Schema<IProductQA>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true, trim: true },
    answers: [AnswerSchema],
    isAnswered: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

ProductQASchema.index({ product: 1, createdAt: -1 })

export default mongoose.models.ProductQA || mongoose.model<IProductQA>('ProductQA', ProductQASchema)
