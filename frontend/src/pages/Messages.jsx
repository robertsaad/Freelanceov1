import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Send, MessageSquare, Search, ArrowLeft, Briefcase, ExternalLink } from "lucide-react";

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
  const navigate = useNavigate();
  // @job mention: details dialog + composer autocomplete
  const [jobCard, setJobCard] = useState(null);
  const [jobCardOpen, setJobCardOpen] = useState(false);
  const [suggest, setSuggest] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
    // Poll the conversation list so new incoming chats / unread counts appear live
    const t = setInterval(fetchConversations, 8000);
    return () => clearInterval(t);
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
    if (!selectedUser) return;
    fetchMessages(selectedUser.id);
    // Poll the open thread so new messages appear without a manual refresh
    const t = setInterval(() => fetchMessages(selectedUser.id, true), 4000);
    return () => clearInterval(t);
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

  const fetchMessages = async (userId, silent = false) => {
    try {
      const response = await axios.get(`${API}/messages/${userId}`, { withCredentials: true });
      const next = response.data || [];
      setMessages((prev) => {
        // Skip the state update when nothing changed, so polling doesn't jump the scroll
        const last = prev[prev.length - 1];
        const nextLast = next[next.length - 1];
        if (silent && prev.length === next.length && last?.id === nextLast?.id) {
          return prev;
        }
        return next;
      });
    } catch (error) {
      if (!silent) console.error("Error fetching messages:", error);
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

  // --- @job mentions -------------------------------------------------------
  const openJobCard = async (num) => {
    try {
      const r = await axios.get(`${API}/jobs/ref/${num}`, { withCredentials: true });
      setJobCard(r.data);
      setJobCardOpen(true);
    } catch (e) {
      toast.error(`Job #${num} not found`);
    }
  };

  const fetchSuggest = async (q) => {
    try {
      const r = await axios.get(`${API}/jobs/mention-search?q=${encodeURIComponent(q)}`, { withCredentials: true });
      const list = r.data || [];
      setSuggest(list);
      setSuggestOpen(list.length > 0);
    } catch (e) {
      setSuggest([]);
      setSuggestOpen(false);
    }
  };

  const onComposerChange = (val) => {
    setNewMessage(val);
    const m = /@(\w*)$/.exec(val);
    if (m) {
      fetchSuggest(m[1]);
    } else {
      setSuggestOpen(false);
      setSuggest([]);
    }
  };

  const pickMention = (job) => {
    setNewMessage((prev) => prev.replace(/@(\w*)$/, `@job${job.job_number} `));
    setSuggestOpen(false);
    setSuggest([]);
  };

  const renderContent = (text, isSent) => {
    const parts = String(text || "").split(/(@job\d+)/gi);
    return parts.map((part, i) => {
      const m = /^@job(\d+)$/i.exec(part);
      if (m) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => openJobCard(m[1])}
            className={`font-semibold underline decoration-dotted underline-offset-2 ${
              isSent ? "text-white hover:text-cyan-100" : "text-cyan-700 hover:text-cyan-900"
            }`}
          >
            {part}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
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
                            <p className="whitespace-pre-wrap break-words">{renderContent(msg.content, msg.sender_id === user?.id)}</p>
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
                  <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2 relative">
                    {suggestOpen && suggest.length > 0 && (
                      <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
                        <div className="px-3 py-2 text-xs text-gray-400 border-b">Tag a job</div>
                        {suggest.map((j) => (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => pickMention(j)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Briefcase className="h-4 w-4 text-cyan-600 flex-shrink-0" />
                            <span className="font-medium text-gray-700">@job{j.job_number}</span>
                            <span className="text-gray-500 truncate">{j.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <Input
                      placeholder="Type a message... (type @ to tag a job)"
                      value={newMessage}
                      onChange={(e) => onComposerChange(e.target.value)}
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

      {/* Job mention details */}
      <Dialog open={jobCardOpen} onOpenChange={setJobCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-cyan-600" />
              {jobCard ? `@job${jobCard.job_number}` : "Job"}
            </DialogTitle>
          </DialogHeader>
          {jobCard && (
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{jobCard.title}</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className={jobCard.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                    {jobCard.status}
                  </Badge>
                  {jobCard.category && <Badge variant="secondary">{jobCard.category}</Badge>}
                  {jobCard.remote && <Badge className="bg-blue-100 text-blue-700">Remote</Badge>}
                </div>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                {(jobCard.budget_min || jobCard.budget_max) && (
                  <p>
                    <span className="font-medium text-gray-800">Budget:</span>{" "}
                    {jobCard.budget_min ? `$${Number(jobCard.budget_min).toLocaleString()}` : ""}
                    {jobCard.budget_min && jobCard.budget_max ? " - " : ""}
                    {jobCard.budget_max ? `$${Number(jobCard.budget_max).toLocaleString()}` : ""}
                    {jobCard.budget_type ? ` (${jobCard.budget_type})` : ""}
                  </p>
                )}
                {jobCard.client_name && (
                  <p><span className="font-medium text-gray-800">Client:</span> {jobCard.client_name}</p>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => {
                    setJobCardOpen(false);
                    navigate(`/jobs/${jobCard.id}`);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open full job
                </Button>
                <Button variant="outline" onClick={() => setJobCardOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
