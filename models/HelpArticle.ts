import mongoose, { Schema, Document } from 'mongoose'

export type ArticleCategory = 'orders' | 'payments' | 'shipping' | 'returns' | 'account' | 'general'

export interface IHelpArticle extends Document {
  title:       string
  slug:        string
  body:        string   // markdown content
  category:    ArticleCategory
  tags:        string[]
  views:       number
  isPublished: boolean
  createdBy:   mongoose.Types.ObjectId
  createdAt:   Date
  updatedAt:   Date
}

const HelpArticleSchema = new Schema<IHelpArticle>({
  title:      { type: String, required: true },
  slug:       { type: String, unique: true, sparse: true },
  body:       { type: String, required: true },
  category:   { type: String, enum: ['orders','payments','shipping','returns','account','general'], required: true },
  tags:       [{ type: String }],
  views:      { type: Number, default: 0 },
  isPublished:{ type: Boolean, default: true },
  createdBy:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

HelpArticleSchema.index({ title: 'text', body: 'text', tags: 'text' })
HelpArticleSchema.index({ category: 1, isPublished: 1 })

HelpArticleSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }
  next()
})

export default mongoose.models.HelpArticle ||
  mongoose.model<IHelpArticle>('HelpArticle', HelpArticleSchema)
