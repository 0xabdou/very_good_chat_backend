import express from "express";
import {Tokens} from "../data/tokens";

const authRouter = (tokens: Tokens) => {
  const router = express.Router();

  router.get('/refresh_token', async (req, res) => {
    const token = req.cookies.veryGoodCookie;
    if (!token)
      return res.status(401).json({error: 'UNAUTHENTICATED'});
    try {
      const userID = tokens.verifyRefreshToken(token);
      const accessToken = tokens.generateAccessToken(userID);
      return res.json({accessToken});
    } catch (e) {
      return res.status(401).json({error: 'UNAUTHENTICATED'});
    }
  });

  router.get('/logout', async (req, res) => {
    res.clearCookie('veryGoodCookie', {path: '/auth'});
    res.send({data: 'success'});
  });

  return router;
};

export default authRouter;