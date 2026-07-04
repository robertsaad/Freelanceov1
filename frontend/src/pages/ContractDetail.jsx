import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth, API } from "@/App";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  NotebookPen,
  Briefcase,
} from "lucide-react";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  ended: "bg-gray-200 text-gray-600",
};

export default function ContractDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const fetchContract = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/contracts/${id}`, { withCredentials: true });
      setContract(res.data);
    } catch (error) {
      if (error.response?.status === 404 || error.response?.status === 403) {
        toast.error("Contract not found");
        navigate("/dashboard/contracts");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const updateStatus = async (status) => {
    try {
      await axios.put(`${API}/contracts/${id}`, { status }, { withCredentials: true });
      toast.success(`Contract marked ${status}`);
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update contract");
    }
  };

  const addEntry = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    try {
      await axios.post(
        `${API}/contracts/${id}/diary`,
        { note: note.trim(), entry_date: entryDate },
        { withCredentials: true }
      );
      setNote("");
      toast.success("Entry added");
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entryId) => {
    try {
      await axios.delete(`${API}/contracts/${id}/diary/${entryId}`, { withCredentials: true });
      toast.success("Entry removed");
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove entry");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-xl" />
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!contract) return null;

  const cp =
    user?.role === "client"
      ? { name: contract.freelancer?.user?.name, picture: contract.freelancer?.user?.picture, sub: contract.freelancer?.title || "Freelancer" }
      : { name: contract.client?.name, picture: contract.client?.picture, sub: "Client" };

  const diary = contract.diary || [];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="contract-detail-page">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/dashboard/contracts"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-cyan-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contracts
        </Link>

        {/* Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={cp.picture} />
                  <AvatarFallback className="bg-cyan-600 text-white">
                    {getInitials(cp.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{contract.title}</h1>
                    <Badge className={`${STATUS_STYLES[contract.status]} capitalize`}>
                      {contract.status}
                    </Badge>
                  </div>
                  <p className="text-gray-500 mt-1">
                    {cp.name} · {cp.sub}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                    {contract.budget != null && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-4 w-4" />
                        Budget: ${Number(contract.budget).toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Started {new Date(contract.started_at || contract.created_at).toLocaleDateString()}
                    </span>
                    {contract.ended_at && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Ended {new Date(contract.ended_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {contract.status === "active" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => updateStatus("completed")}
                    data-testid="complete-contract-btn"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-gray-600"
                    onClick={() => updateStatus("ended")}
                    data-testid="end-contract-btn"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    End
                  </Button>
                </div>
              )}
            </div>

            {contract.description && (
              <p className="text-gray-600 mt-5 whitespace-pre-line border-t border-gray-100 pt-4">
                {contract.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Work diary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <NotebookPen className="h-5 w-5 text-cyan-600" />
              Work diary
            </CardTitle>
            <p className="text-sm text-gray-500">
              Log progress, milestones and notes for this contract.
            </p>
          </CardHeader>
          <CardContent>
            {contract.status === "active" && (
              <form onSubmit={addEntry} className="space-y-3 mb-6" data-testid="diary-form">
                <Textarea
                  placeholder="What did you work on? e.g. Delivered homepage design mockups for review."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  data-testid="diary-note-input"
                />
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-44"
                    data-testid="diary-date-input"
                  />
                  <Button
                    type="submit"
                    disabled={saving || !note.trim()}
                    className="bg-cyan-600 hover:bg-cyan-700"
                    data-testid="diary-add-btn"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add entry
                  </Button>
                </div>
              </form>
            )}

            {diary.length > 0 ? (
              <div className="space-y-4" data-testid="diary-list">
                {diary.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-3 border-l-2 border-cyan-200 pl-4 py-1 group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-medium text-gray-700">
                          {new Date(entry.entry_date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>· {entry.author_name}</span>
                      </div>
                      <p className="text-gray-800 mt-1 whitespace-pre-line">{entry.note}</p>
                    </div>
                    {entry.author_id === user?.id && (
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity self-start"
                        title="Delete entry"
                        data-testid={`diary-delete-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500" data-testid="diary-empty">
                <NotebookPen className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p>No entries yet.</p>
                {contract.status === "active" && (
                  <p className="text-sm">Add your first update above.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
