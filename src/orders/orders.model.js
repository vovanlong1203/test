import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema(
    {
        orderId: String,
        products: [
            {
                productId: { type: String, required: true },
                quantity: { type: Number, required: true },
            },
        ],
        amount: Number,
        email: { type: String, required: true },
        address: { type: String },
        status: {
            type: String,
            enum: ["pending", "processing", "shipped", "completed"],
            default: "pending",
        },
    },
    { timestamps: true }
);

const Order = mongoose.model('Order', OrderSchema);
export default Order