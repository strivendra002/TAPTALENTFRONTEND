import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";

const SOCKET_URL = "https://taptalentbackend-1.onrender.com"; 

function App() {
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState("light");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);

   socketRef.current.on("connect", () => {
  console.log("Connected to server");
  setIsSocketConnected(true);
});

socketRef.current.on("disconnect", () => {
  setIsSocketConnected(false);
});

   socketRef.current.on("matched", (data) => {
  if (status !== "searching") {
    console.warn("Ignoring stale matched event", data);
    return;
  }

  if (!data?.chatId) {
    console.warn("Invalid match payload", data);
    return;
  }

  setChatId(data.chatId);
  setStatus("connected");
  setMessages([]);
});

    socketRef.current.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, { from: "partner", text: msg }]);
    });

    socketRef.current.on("typing", () => {
      setIsTyping(true);
      setTimeout(() => setIsTyping(false), 2000);
    });

    socketRef.current.on("partner-left", () => {
      setStatus("idle");
      setChatId(null);
      setMessages([]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

 const findMatch = () => {
  if (status !== "idle") return;
  setStatus("searching");
  socketRef.current.emit("find-match");
};

const sendMessage = () => {
  if (status !== "connected") return;
  if (!chatId) return;
  if (!input.trim()) return;

  socketRef.current.emit("send-message", {
    chatId,
    message: input,
  });

  setMessages((prev) => [...prev, { from: "me", text: input }]);
  setInput("");
};

 const handleTyping = () => {
  if (status !== "connected" || !chatId) return;
  socketRef.current.emit("typing", { chatId });
};

const skipChat = () => {
  socketRef.current.emit("skip-chat");

  setStatus("idle");
  setChatId(null);
  setMessages([]);
};

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const addEmoji = (emoji) => {
    setInput(input + emoji);
    setShowEmojiPicker(false);
  };

  const emojis = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "✨", "🌟"];

  return (
    <div style={{
      ...styles.container,
      backgroundColor: theme === "light" ? "#f5f5f5" : "#1a1a1a",
      color: theme === "light" ? "#333" : "#fff",
    }}>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={styles.header}
      >
        <h1 style={styles.title}>
          <span style={styles.titleIcon}>💬</span>
          Anonymous Chat
        </h1>
        <button onClick={toggleTheme} style={styles.themeToggle}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {status === "idle" && (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={styles.content}
          >
            <div style={styles.welcomeCard}>
              <h2 style={styles.welcomeTitle}>Welcome to Anonymous Chat</h2>
              <p style={styles.welcomeText}>
                Connect with random strangers anonymously. Start a conversation now!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={findMatch}
                style={styles.startButton}
              >
                <span style={styles.buttonIcon}>🔍</span>
                Start Chat
              </motion.button>
            </div>
          </motion.div>
        )}

        {status === "searching" && (
          <motion.div
            key="searching"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={styles.content}
          >
            <div style={styles.searchingCard}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={styles.spinner}
              >
                🔍
              </motion.div>
              <p style={styles.searchingText}>Searching for a partner...</p>
              <p style={styles.searchingSubtext}>This might take a moment</p>
            </div>
          </motion.div>
        )}

        {status === "connected" && (
          <motion.div
            key="connected"
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={styles.content}
          >
            <div style={styles.chatContainer}>
              <div style={styles.chatHeader}>
                <span style={styles.chatStatus}>
                  <span style={styles.onlineDot}></span>
                  Connected
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={skipChat}
                  style={styles.skipButton}
                >
                  <span style={styles.buttonIcon}>↪️</span>
                  Skip
                </motion.button>
              </div>

              <div style={styles.chatBox}>
                <AnimatePresence>
                  {messages.map((m, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: m.from === "me" ? 50 : -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        ...styles.messageWrapper,
                        justifyContent: m.from === "me" ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          ...styles.messageBubble,
                          backgroundColor: m.from === "me" 
                            ? (theme === "light" ? "#007AFF" : "#0A84FF")
                            : (theme === "light" ? "#E5E5EA" : "#2C2C2E"),
                          color: m.from === "me" ? "#fff" : (theme === "light" ? "#000" : "#fff"),
                        }}
                      >
                        {m.text}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={styles.typingIndicator}
                  >
                    <span style={styles.typingDot}></span>
                    <span style={styles.typingDot}></span>
                    <span style={styles.typingDot}></span>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div style={styles.inputContainer}>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ y: 50, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 50, opacity: 0 }}
                      style={styles.emojiPicker}
                    >
                      {emojis.map((emoji, index) => (
                        <motion.span
                          key={index}
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => addEmoji(emoji)}
                          style={styles.emoji}
                        >
                          {emoji}
                        </motion.span>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={styles.inputRow}>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    style={styles.emojiButton}
                  >
                    😊
                  </motion.button>
                  
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendMessage();
                      handleTyping();
                    }}
                    placeholder="Type your message..."
                    style={{
                      ...styles.input,
                      backgroundColor: theme === "light" ? "#fff" : "#2C2C2E",
                      color: theme === "light" ? "#000" : "#fff",
                      borderColor: theme === "light" ? "#ddd" : "#3A3A3C",
                    }}
                  />
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={sendMessage}
                    style={styles.sendButton}
                    disabled={!input.trim()}
                  >
                    <span style={styles.buttonIcon}>➤</span>
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    transition: "background-color 0.3s ease",
    padding: "20px",
  },
  header: {
    position: "absolute",
    top: "20px",
    right: "20px",
    left: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: "24px",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  titleIcon: {
    fontSize: "32px",
  },
  themeToggle: {
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    padding: "8px",
    borderRadius: "50%",
    transition: "background-color 0.3s",
  },
  content: {
    width: "100%",
    maxWidth: "500px",
  },
  welcomeCard: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  },
  welcomeTitle: {
    fontSize: "28px",
    marginBottom: "15px",
  },
  welcomeText: {
    fontSize: "16px",
    marginBottom: "30px",
    opacity: 0.8,
    lineHeight: "1.6",
  },
  startButton: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    border: "none",
    padding: "15px 40px",
    borderRadius: "50px",
    fontSize: "18px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    margin: "0 auto",
    transition: "transform 0.2s",
  },
  searchingCard: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    padding: "40px",
    textAlign: "center",
  },
  spinner: {
    fontSize: "48px",
    marginBottom: "20px",
  },
  searchingText: {
    fontSize: "20px",
    marginBottom: "10px",
  },
  searchingSubtext: {
    fontSize: "14px",
    opacity: 0.7,
  },
  chatContainer: {
    background: "rgba(255, 255, 255, 0.1)",
    backdropFilter: "blur(10px)",
    borderRadius: "20px",
    overflow: "hidden",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
  },
  chatStatus: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
  },
  onlineDot: {
    width: "8px",
    height: "8px",
    backgroundColor: "#4CAF50",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  skipButton: {
    background: "none",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    padding: "8px 15px",
    borderRadius: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "5px",
    color: "inherit",
  },
  chatBox: {
    height: "400px",
    overflowY: "auto",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  messageWrapper: {
    display: "flex",
    width: "100%",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: "10px 15px",
    borderRadius: "20px",
    wordBreak: "break-word",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
  },
  typingIndicator: {
    display: "flex",
    gap: "5px",
    padding: "10px",
    alignSelf: "flex-start",
  },
  typingDot: {
    width: "8px",
    height: "8px",
    backgroundColor: "#999",
    borderRadius: "50%",
    animation: "typing 1.4s infinite",
  },
  inputContainer: {
    padding: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.2)",
    position: "relative",
  },
  emojiPicker: {
    position: "absolute",
    bottom: "100%",
    left: "20px",
    right: "20px",
    background: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: "15px",
    padding: "15px",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "10px",
    marginBottom: "10px",
    boxShadow: "0 -5px 20px rgba(0, 0, 0, 0.1)",
  },
  emoji: {
    fontSize: "24px",
    cursor: "pointer",
    textAlign: "center",
    padding: "5px",
    borderRadius: "8px",
    transition: "background-color 0.2s",
  },
  inputRow: {
    display: "flex",
    gap: "10px",
  },
  emojiButton: {
    background: "none",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "50%",
    width: "45px",
    height: "45px",
    fontSize: "20px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    padding: "12px 15px",
    border: "1px solid",
    borderRadius: "25px",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.3s",
  },
  sendButton: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: "45px",
    height: "45px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 0.2s",
    opacity: 1,
    disabled: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  buttonIcon: {
    fontSize: "18px",
  },
};

// Add keyframe animations to the document
const style = document.createElement('style');
style.innerHTML = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  @keyframes typing {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-10px); }
  }
`;
document.head.appendChild(style);

export default App;