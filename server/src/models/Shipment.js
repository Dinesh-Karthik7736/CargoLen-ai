import mongoose from "mongoose";

const shipmentSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    trim: true,
    maxlength: 64
  },
  importerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  supplierName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 160
  },
  status: {
    type: String,
    enum: ["draft", "processing", "needs_review", "ready_for_approval", "approved", "exported"],
    default: "draft",
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User"
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  strict: "throw"
});

shipmentSchema.index({ reference: 1 }, { unique: true });
shipmentSchema.index({ status: 1, updatedAt: -1 });
shipmentSchema.index({ importerName: 1, updatedAt: -1 });

export const Shipment = mongoose.model("Shipment", shipmentSchema);
