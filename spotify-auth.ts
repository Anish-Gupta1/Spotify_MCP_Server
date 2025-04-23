import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import request from 'request';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import querystring from 'querystring';
import crypto from 'crypto';


const app = express();
const port = 8888;

const client_id = process.env.SPOTIFY_CLIENT_ID as string;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET as string;
const redirect_uri = 'http://127.0.0.1:8888/callback';

const stateKey = 'spotify_auth_state';

const generateRandomString = (length: number): string =>
  crypto.randomBytes(length).toString('hex').slice(0, length);

app.use(cors());
app.use(cookieParser());

app.get('/login', ( _req: Request, res: Response) => {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private user-read-playback-position user-read-recently-played user-top-read user-library-modify user-library-read';

  const authUrl = 'https://accounts.spotify.com/authorize?' + querystring.stringify({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri,
    state
  });

  res.redirect(authUrl);
});
let currentAccessToken: string | null = null;

app.get('/callback', (req: Request, res: Response) => {
  const code = req.query.code as string || null;
  const state = req.query.state as string || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (!state || state !== storedState) {
    return res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
  }

  res.clearCookie(stateKey);

  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      code,
      redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    json: true
  };

  request.post(authOptions, (error, response, body) => {
    if (!error && response.statusCode === 200) {
        const { access_token, refresh_token } = body;
        currentAccessToken = access_token;
      res.send({ access_token, refresh_token });
    } else {
      res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
    }
  });
});

app.get('/token', (req: Request, res: Response) => {
  if (currentAccessToken) {
    res.json({ access_token: currentAccessToken });
  } else {
    res.status(401).json({ error: "No token found. Please login first." });
  }
});


 // Fetch and log the user's Spotify profile using the provided access token
export function getUserProfile(access_token: string): void {
    if (!access_token) {
      console.error('Missing access_token');
      return;
    }
  
    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      json: true
    };
  
    request.get(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
          console.log('User Profile:', body);
      } else {
        console.error('Failed to fetch profile:', body);
      }
    });
};

export function getUserId(access_token: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    if (!access_token) {
      console.error('Missing access_token');
      return resolve(null);
    }

    const options = {
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      json: true
    };

    request.get(options, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(body.id);
      } else {
        console.error('Failed to fetch user ID:', body);
        resolve(null);
      }
    });
  });
}

 export function getCurrentlyPlaying(access_token: string): void {
  if (!access_token) {
    console.error('Missing access_token');
    return;
  }

  const options = {
    url: 'https://api.spotify.com/v1/me/player/currently-playing',
    headers: {
      'Authorization': `Bearer ${access_token}`
    },
    json: true
  };

  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      console.log('Currently Playing:', body);
    } else if (response.statusCode === 204) {
      console.log('No track currently playing.');
    } else {
      console.error('Failed to fetch currently playing track:', body);
    }
  });
}

export async function getUserPlaylist(access_token: string): Promise<void> {
  if (!access_token) {
    console.error('Missing access_token');
    return;
  }
  const userID = await getUserId(access_token);
  const options = {
    url: `https://api.spotify.com/v1/users/${userID}/playlists`,
    headers: {
      'Authorization': `Bearer ${access_token}`
    },
    json: true
  };

  request.get(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      console.log('User Playlists:', body);
    } else {
      console.error('Failed to fetch user playlists:', body);
    }
  });
}



app.listen(port, () => {
  console.log(`Spotify auth server running at http://127.0.0.1:${port}`);
});
