const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cron = require("node-cron");
const dotenv = require("dotenv").config({
  path: "./configs/environments.env",
});

const app = express();

const ServerErrorResponse = require("./utils/classes/ServerErrorResponse");
const CropAlert = require("./models/CropAlert");

const { connectDB } = require("./configs/DBConnection");
const { connectSocketIo } = require("./socket-io/SocketIOHandler");

const mongoose = require("mongoose");
const morgan = require("morgan");

const cors = require("cors");

app.use(
  cors({
    origin: "*",
  })
);

app.use(express.json({ limit: "50mb" }));

app.use(
  express.urlencoded({ extended: false, limit: "50mb", parameterLimit: 50000 })
);

app.use(morgan("dev"));

const allRoutes = require("./routes/AllRoutes");
const {
  sendBulkNotifications,
  sendNotification,
} = require("./utils/FCM-Helper");

app.use("/api", allRoutes);

const PORT = process.env.PORT || 8080;

app.all("*", (req, res, next) =>
  next(
    res.status(404).json(
      ServerErrorResponse.customError(
        "Failed",
        404,
        `can't find ${req.originalUrl} on this server`,
        {
          metadata: {
            method: req.method,
          },
        }
      )
    )
  )
);

const server = http.createServer(app);

// const io = socketIO(server);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

cron.schedule("*/5 * * * * *", async () => {
  try {
    const now = new Date();
    let userTokens = [];

    const cropAlerts = await CropAlert.find({
      dateAndTime: { $lte: now },
      notificationSent: false,
    }).populate("user");

    // console.log("cropAlerts: ", cropAlerts);

    for (const alert of cropAlerts) {
      const user = alert.user;

      if (user && user.fcmToken) {
        userTokens.push(user.fcmToken);
        await sendNotification(alert.title, alert.description, user.fcmToken);
        alert.notificationSent = true;
        await alert.save();
      }
    }

    // if (userTokens && userTokens.length > 0) {
    //   await sendBulkNotifications(
    //     "Crop Alert",
    //     "You have a crop alert!",
    //     userTokens
    //   );
    // }
  } catch (error) {
    console.error("Error running cron job:", error);
  }
});

server.listen(PORT, (err) => {
  if (err) {
    console.log("Error While Starting AgriPlus Server: ", err);
  } else {
    console.log(
      `AgriPlus Server Is Listening on PORT: ${PORT} - Server ID: ${process.pid}`
    );
    connectDB();
    connectSocketIo(io);
  }
});

// safin token

// cQcSwOPxQzmMSeUvFkITB3:APA91bFoiYJoo83HW2k6ldTcXAlmW3nh9kcv7V-90Z9ya8Rx1_IZW0tTXvjXbQRMLsQQt2POOotYoK3NYtl684N8jsyXK0fxJnZNiq5644XOOxEHOwvMJ0cgHtRin9NusJcyJCFBIq4W

// sandesh token

// fXNKWuq1QdmjGxB22Nd1b_:APA91bGo5PvV_lywq09PLWW4gGPNJYVg0M09TMhUBRbHaUtpxOsqpRzIZs8rsxcf2wfeQ263r9Cs38ia93bFgJS-m0dBuZ3RoeoA-53PVvDdIo7z-slOWzTUjBZHNC12qRSgmkvc83RS
