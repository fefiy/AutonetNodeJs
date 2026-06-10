import { Server } from "socket.io";
import http from "http";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.APP_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", true);
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));

const io = new Server(server, {
  cors: {
    origin: [process.env.APP_URL, process.env.APP_URL_TWO],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const userSocketMap = {};

io.on("connection", (socket) => {
  socket.on("register", async (user_id) => {
    console.log(`connected to ${socket.id}`);
    if (user_id in userSocketMap) {
      if (!userSocketMap[user_id].includes(socket.id)) {
        userSocketMap[user_id].push(socket.id);
      }
    } else {
      userSocketMap[user_id] = [socket.id];
    }
    console.log("userSocketMap from socket.js", userSocketMap);
  });

  socket.on("disconnect", () => {
    for (let user_id in userSocketMap) {
      const socketIds = userSocketMap[user_id];
      const index = socketIds.indexOf(socket.id);
      if (index !== -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          delete userSocketMap[user_id];
        }
        break;
      }
    }
  });
});

export { app, io, server, userSocketMap };
