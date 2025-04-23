import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getUserProfile, getUserId, getCurrentlyPlaying, getUserPlaylist } from './spotify-auth'; // update with actual path

// Create an MCP server
const server = new McpServer({
  name: "Spotify-MCP",
  version: "1.0.0"
});


async function fetchAccessToken(): Promise<string | null> {
  const res = await fetch("http://localhost:8888/token");
  if (res.status !== 200) return null;
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

server.tool("get-my-spotify-profile", {}, async () => {
  const access_token = await fetchAccessToken();
  if (!access_token) {
    return {
      content: [{
        type: "text",
        text: "Access token not found. Please log in via http://localhost:8888/login"
      }]
    };
  }
  getUserProfile(access_token);
  return { content: [{ type: "text", text: "Fetched user profile." }] };
});

server.tool("get-my-spotify-id", {}, async () => {
  const access_token = await fetchAccessToken();
  if (!access_token) {
    return {
      content: [{
        type: "text",
        text: "Access token not found. Please log in via http://localhost:8888/login"
      }]
    };
  }
  const userId = await getUserId(access_token);
  return { content: [{ type: "text", text: `User ID: ${userId}` }] };
});

server.tool("get-currently-playing", {}, async () => {
  const access_token = await fetchAccessToken();
  if (!access_token) {
    return {
      content: [{
        type: "text",
        text: "Access token not found. Please log in via http://localhost:8888/login"
      }]
    };
  }
  getCurrentlyPlaying(access_token);
  return { content: [{ type: "text", text: "Fetched currently playing track." }] };
});

server.tool("get-my-spotify-playlists", {}, async () => {
  const access_token = await fetchAccessToken();
  if (!access_token) {
    return {
      content: [{
        type: "text",
        text: "Access token not found. Please log in via http://localhost:8888/login"
      }]
    };
  }
  await getUserPlaylist(access_token);
  return { content: [{ type: "text", text: "Fetched user playlists." }] };
});

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);