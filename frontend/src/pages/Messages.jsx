import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, MessageSquare, Search, ArrowLeft } from "lucide-react";

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchConversations();
  }, []);

  // Deep-link: /dashboard/messages?userId=..&name=..&picture=.. opens that chat directly
  useEffect(() => {
    const uid = searchParams.get("userId");
    if (uid) {
      setSelectedUser({
        id: uid,
        name: searchParams.get("name") || "User",
        picture: searchParams.get("picture") || null,
      });
      // clear params so refresh/back doesn't re-trigger
      setSearchParams({}, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get(`${API}/messages`, { withCredentials: true });
      setConversations(response.data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const response = await axios.get(`${API}/messages/${userId}`, { withCredentials: true });
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    try {
      const response = await axios.post(
        `${API}/messages`,
        { receiver_id: selectedUser.id, content: newMessage },
        { withCredentials: true }
      );
      setMessages([...messages, response.data]);
      setNewMessage("");
      fetchConversations();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0" data-testid="messages-page">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Messages</h1>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ height: "70vh" }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r flex flex-col" data-testid="conversations-list">
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="search-conversations-input"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="animate-pulse flex gap-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24" />
                          <div className="h-3 bg-gray-200 rounded w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.user?.id}
                      onClick={() => setSelectedUser(conv.user)}
                      className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 border-b transition-colors ${
                        selectedUser?.id === conv.user?.id ? "bg-cyan-50" : ""
                      }`}
                      data-testid={`conversation-${conv.user?.id}`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conv.user?.picture} />
                        <AvatarFallback className="bg-cyan-600 text-white text-sm">
                          {getInitials(conv.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 truncate">{conv.user?.name}</span>
                          {conv.unread_count > 0 && (
                            <span className="bg-cyan-600 text-white text-xs px-2 py-0.5 rounded-full">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No conversations yet</p>
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col" data-testid="chat-area">
              {selectedUser ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedUser.picture} />
                      <AvatarFallback className="bg-cyan-600 text-white">
                        {getInitials(selectedUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium text-gray-900">{selectedUser.name}</h3>
                      <p className="text-sm text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                          data-testid={`message-${msg.id}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                              msg.sender_id === user?.id
                                ? "message-sent rounded-br-md"
                                : "message-received rounded-bl-md"
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? "text-cyan-100" : "text-gray-400"}`}>
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1"
                      data-testid="message-input"
                    />
                    <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700" disabled={sending} data-testid="send-message-btn">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Select a conversation</h3>
                    <p className="text-gray-500 mt-1">Choose a conversation from the list to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MobileNav />
    </div>
  );
}
