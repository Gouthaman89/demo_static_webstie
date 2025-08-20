import React, { useState, useRef, useEffect } from 'react';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import SendIcon from '@material-ui/icons/Send';
import ChatBubbleIcon from '@material-ui/icons/ChatBubble';
import MinimizeIcon from '@material-ui/icons/Minimize';
import ClearAllIcon from '@material-ui/icons/ClearAll';

const Chat = ({ user }) => {
  const [open, setOpen] = useState(false); // Controls whether the chat window is open
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const query = async (data) => {
    try {
      const response = await fetch(
        "http://130.33.75.207:3000/api/v1/prediction/c13db90b-b452-416d-b9e6-434c9f35a917",
        {
          headers: {
            Authorization: "Bearer eTqFs7NoUAg0ehVEjRpa0Au1qPkQSRl8i3dmSJHPcZg",
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify(data),
        }
      );
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error:", error);
      return { text: "Error connecting to chat server." };
    }
  };

  // Auto-scroll to the bottom when messages update
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Append user message
    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");

    // Get bot response and append
    const response = await query({ question: input });
    setMessages([...newMessages, { sender: "bot", text: response.text }]);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  // Clear chat messages
  const clearChat = () => {
    setMessages([]);
  };

  // Minimize chat window
  const minimizeChat = () => {
    setOpen(false);
  };

  // When chat is closed, show only the chat icon
  if (!open) {
    return (
      <Box style={{ position: "fixed", bottom: 20, right: 20 }}>
        <Tooltip title="Open Chat">
          <IconButton 
            onClick={() => setOpen(true)}
            style={{ backgroundColor: "#1976d2", color: "#fff" }}>
            <ChatBubbleIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  // When chat is open, show the full chat window
  return (
    <Paper elevation={4} style={{ 
      position: "fixed", 
      bottom: 20, 
      right: 20, 
      width: 350, 
      maxHeight: "80vh", 
      display: "flex", 
      flexDirection: "column", 
      borderRadius: 8 
    }}>
      {/* Chat Header with Minimize and Clear Chat buttons */}
      <Box style={{ 
        backgroundColor: "#1976d2", 
        color: "#fff", 
        padding: 8, 
        borderTopLeftRadius: 8, 
        borderTopRightRadius: 8, 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center" 
      }}>
        <Typography variant="h6">Chat Support</Typography>
        <Box>
          <Tooltip title="Clear Chat">
            <IconButton onClick={clearChat} style={{ color: "#fff" }}>
              <ClearAllIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Minimize">
            <IconButton onClick={minimizeChat} style={{ color: "#fff" }}>
              <MinimizeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Chat Messages */}
      <Box style={{ flexGrow: 1, padding: 16, overflowY: "auto", backgroundColor: "#f9f9f9" }}>
        {messages.map((msg, index) => (
          <Box key={index} style={{ 
            display: "flex", 
            justifyContent: msg.sender === "user" ? "flex-end" : "flex-start", 
            marginBottom: 8 
          }}>
            <Box style={{ 
              padding: 12, 
              borderRadius: 8, 
              backgroundColor: msg.sender === "user" ? "#1976d2" : "#e0e0e0", 
              color: msg.sender === "user" ? "#fff" : "#000", 
              maxWidth: "80%" 
            }}>
              <Typography variant="body2">{msg.text}</Typography>
            </Box>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      {/* Chat Input */}
      <Box style={{ display: "flex", padding: 8, borderTop: "1px solid #ddd" }}>
        <TextField
          variant="outlined"
          placeholder="Type a message..."
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          style={{ flexGrow: 1 }}
        />
        <IconButton color="primary" onClick={sendMessage}>
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
};

export default Chat;