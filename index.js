import mongoose from 'mongoose';
import cors from 'cors';
import express from 'express';
import crypto from 'crypto';
import https from 'https';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import Order from './src/orders/orders.model.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// middleware setup
app.use(express.json({ limit: "25mb" }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: [

        'http://localhost:5001',
        'http://localhost:5173',
        'http://localhost:5174'
    ],
    credentials: true
}));

// image upload
import uploadImage from './src/utils/uploadImage.js';

// all routes
import authRoutes from './src/users/user.route.js';
import productRoutes from './src/products/products.route.js';
import reviewRoutes from './src/reviews/reviews.router.js';
import orderRoutes from './src/orders/orders.route.js';
import statsRoutes from './src/stats/stats.route.js';

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);

const isAuthenticated = (req, res, next) => {
    const user = req.body.user;

    if (user) {
        console.log("User:", user);
        next();
    } else {
        res.status(401).send("Unauthorized");
    }
};

app.post('/api/momo/pay', isAuthenticated, async (req, res) => {
    const { amount, orderInfo, products, email, address } = req.body;

    console.log("Amount:", amount);
    console.log("Order Info:", orderInfo);
    console.log("Products:", products);
    console.log("Email:", email);
    console.log("Address:", address);


    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const partnerCode = 'MOMO';
    const redirectUrl = 'http://localhost:5001/api/orders/confirm-payment';
    const ipnUrl = 'http://localhost:5001/api/orders/confirm-payment';
    const requestType = "payWithMethod";
    const orderId = partnerCode + new Date().getTime();
    const requestId = orderId;
    const extraData = '';
    const autoCapture = true;
    const lang = 'vi';
    const orderGroupId = '';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    console.log("--------------------RAW SIGNATURE----------------");
    console.log(rawSignature);

    const signature = crypto.createHmac('sha256', secretKey)
        .update(rawSignature)
        .digest('hex');
    console.log("--------------------SIGNATURE----------------");
    console.log(signature);

    const requestBody = JSON.stringify({
        partnerCode: partnerCode,
        partnerName: "Test",
        storeId: "MomoTestStore",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        lang: lang,
        requestType: requestType,
        autoCapture: autoCapture,
        extraData: extraData,
        orderGroupId: orderGroupId,
        signature: signature
    });

    const options = {
        hostname: 'test-payment.momo.vn',
        port: 443,
        path: '/v2/gateway/api/create',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };

    const momoReq = https.request(options, momoRes => {
        let data = '';
        momoRes.on('data', chunk => {
            data += chunk;
        });
        momoRes.on('end', async () => {
            const response = JSON.parse(data);

            if (response.payUrl) {
                // Create order in MongoDB
                const order = new Order({
                    orderId: orderId,
                    products: products,
                    amount: amount,
                    email: email,
                    
                    address: address,
                });

                try {
                    await order.save();
                    res.status(momoRes.statusCode).json(response);
                } catch (error) {
                    console.error("Error saving order:", error);
                    if (!res.headersSent) {
                        res.status(500).send('Internal Server Error');
                    }
                }
            } else {
                if (!res.headersSent) {
                    res.status(500).send('Payment URL not found');
                }
            }
        });
    });

    momoReq.on('error', e => {
        console.error(`problem with request: ${e.message}`);
        if (!res.headersSent) {
            res.status(500).send('Internal Server Error');
        }
    });

    console.log("Sending....");
    momoReq.write(requestBody);
    momoReq.end();
})



    app.post("/uploadImage", (req, res) => {
        uploadImage(req.body.image)
            .then((url) => res.send(url))
            .catch((err) => res.status(500).send(err));
    });


async function main() {
    await mongoose.connect(process.env.DB_URL,{
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    app.get("/", (req, res) => {
        res.send("Duy E-commerce Server is running....!");
    });
}

main()
    .then(() => console.log("mongodb is successfully connected."))
    .catch((err) => console.log(err));

    

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});