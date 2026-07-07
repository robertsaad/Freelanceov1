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
  DollarSign,
  Send,
  ListChecks,
  Flag,
} from "lucide-react";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  ended: "bg-gray-200 text-gray-600",
};

const MS_STYLES = {
  pending: "bg-gray-100 text-gray-600",
  funded: "bg-amber-100 text-amber-700",
  in_progress: "bg-indigo-100 text-indigo-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-teal-100 text-teal-700",
  released: "bg-green-100 text-green-700",
};

const MS_LABELS = {
  pending: "Pending",
  funded: "Funded",
  in_progress: "In progress",
  submitted: "Submitted",
  approved: "Approved",
  released: "Paid",
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
  const [showTermsForm, setShowTermsForm] = useState(false);
  const [termsForm, setTermsForm] = useState({
    payment_type: "milestone",
    timeline: "",
    note: "",
    milestones: [{ title: "", description: "", amount: "", due_date: "" }],
  });

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

  const addMilestoneRow = () =>
    setTermsForm((f) => ({
      ...f,
      milestones: [...f.milestones, { title: "", description: "", amount: "", due_date: "" }],
    }));

  const removeMilestoneRow = (idx) =>
    setTermsForm((f) => ({ ...f, milestones: f.milestones.filter((_, i) => i !== idx) }));

  const updateMilestoneRow = (idx, field, value) =>
    setTermsForm((f) => ({
      ...f,
      milestones: f.milestones.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    }));

  const proposeTerms = async (e) => {
    e.preventDefault();
    const milestones = termsForm.milestones
      .filter((m) => m.title.trim())
      .map((m) => ({
        title: m.title.trim(),
        description: m.description,
        amount: m.amount ? Number(m.amount) : 0,
        due_date: m.due_date || null,
      }));
    if (milestones.length === 0) {
      toast.error("Add at least one milestone");
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API}/contracts/${id}/terms`,
        {
          payment_type: termsForm.payment_type,
          timeline: termsForm.timeline,
          note: termsForm.note,
          milestones,
        },
        { withCredentials: true }
      );
      toast.success("Terms proposed");
      setShowTermsForm(false);
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to propose terms");
    } finally {
      setSaving(false);
    }
  };

  const respondTerms = async (action) => {
    try {
      await axios.post(`${API}/contracts/${id}/terms/${action}`, {}, { withCredentials: true });
      toast.success(action === "accept" ? "Terms accepted" : "Terms declined");
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to respond");
    }
  };

  const doMilestoneAction = async (milestoneId, action) => {
    try {
      await axios.post(
        `${API}/contracts/${id}/milestones/${milestoneId}/action`,
        { action },
        { withCredentials: true }
      );
      fetchContract();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update milestone");
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

        {/* Terms & milestones */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="h-5 w-5 text-cyan-600" />
              Terms &amp; milestones
            </CardTitle>
            <p className="text-sm text-gray-500">
              Agree on payment, timeline and milestones before work begins. Payments are tracked
              here — no money is transferred yet.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {contract.agreement_status === "agreed" ? (
              <>
                <div className="flex flex-wrap gap-4 text-sm bg-gray-50 rounded-lg p-4">
                  <span className="flex items-center gap-1 text-gray-700">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Total:{" "}
                    <span className="font-semibold">
                      ${Number(contract.total_amount || 0).toLocaleString()}
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-gray-700 capitalize">
                    <Flag className="h-4 w-4" />
                    {contract.payment_type}
                  </span>
                  {contract.timeline && (
                    <span className="flex items-center gap-1 text-gray-700">
                      <Clock className="h-4 w-4" />
                      {contract.timeline}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {(contract.milestones || []).map((m, idx) => {
                    const isClient = user?.role === "client";
                    const isFreelancer = user?.role === "freelancer";
                    const active = contract.status === "active";
                    return (
                      <div key={m.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-400">
                                #{idx + 1}
                              </span>
                              <h4 className="font-semibold text-gray-900">{m.title}</h4>
                              <Badge className={`${MS_STYLES[m.status] || ""} text-xs`}>
                                {MS_LABELS[m.status] || m.status}
                              </Badge>
                            </div>
                            {m.description && (
                              <p className="text-sm text-gray-600 mt-1">{m.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                ${Number(m.amount || 0).toLocaleString()}
                              </span>
                              {m.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Due {new Date(m.due_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {active && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {isClient && m.status === "pending" && (
                              <Button size="sm" className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => doMilestoneAction(m.id, "fund")}>
                                Fund milestone
                              </Button>
                            )}
                            {isFreelancer && ["pending", "funded"].includes(m.status) && (
                              <Button size="sm" variant="outline"
                                onClick={() => doMilestoneAction(m.id, "start")}>
                                Start work
                              </Button>
                            )}
                            {isFreelancer && ["funded", "in_progress"].includes(m.status) && (
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => doMilestoneAction(m.id, "submit")}>
                                <Send className="h-3 w-3 mr-1" />
                                Submit work
                              </Button>
                            )}
                            {isClient && m.status === "submitted" && (
                              <>
                                <Button size="sm" className="bg-teal-600 hover:bg-teal-700"
                                  onClick={() => doMilestoneAction(m.id, "approve")}>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-amber-700"
                                  onClick={() => doMilestoneAction(m.id, "request_changes")}>
                                  Request changes
                                </Button>
                              </>
                            )}
                            {isClient && m.status === "approved" && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700"
                                onClick={() => doMilestoneAction(m.id, "release")}>
                                <DollarSign className="h-3 w-3 mr-1" />
                                Release payment
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {contract.proposed_terms ? (
                  <div className="border rounded-lg p-4 bg-indigo-50/40">
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-semibold capitalize">
                        {contract.proposed_terms.proposed_by_role}
                      </span>{" "}
                      proposed these terms:
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                      <span>
                        Total: <b>${Number(contract.proposed_terms.total_amount || 0).toLocaleString()}</b>
                      </span>
                      <span className="capitalize">{contract.proposed_terms.payment_type}</span>
                      {contract.proposed_terms.timeline && <span>{contract.proposed_terms.timeline}</span>}
                    </div>
                    <ul className="space-y-1 mb-3">
                      {(contract.proposed_terms.milestones || []).map((m, i) => (
                        <li key={i} className="text-sm text-gray-700 flex justify-between border-b border-gray-100 py-1">
                          <span>#{i + 1} {m.title}</span>
                          <span className="text-gray-500">${Number(m.amount || 0).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                    {contract.proposed_terms.note && (
                      <p className="text-sm text-gray-500 italic mb-3">"{contract.proposed_terms.note}"</p>
                    )}
                    {contract.proposed_terms.proposed_by === user?.id ? (
                      <p className="text-sm text-gray-500">Waiting for the other party to respond…</p>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700"
                          onClick={() => respondTerms("accept")}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Accept terms
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600"
                          onClick={() => respondTerms("decline")}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No terms agreed yet. Propose milestones and payment to get started.
                  </p>
                )}

                {contract.status === "active" && (
                  <div>
                    {!showTermsForm ? (
                      <Button size="sm" variant="outline" onClick={() => setShowTermsForm(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        {contract.proposed_terms ? "Counter-propose" : "Propose terms"}
                      </Button>
                    ) : (
                      <form onSubmit={proposeTerms} className="space-y-3 border-t pt-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Timeline</label>
                            <Input
                              value={termsForm.timeline}
                              onChange={(e) => setTermsForm({ ...termsForm, timeline: e.target.value })}
                              placeholder="e.g. 3 weeks"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Payment type</label>
                            <div className="flex gap-2 mt-1">
                              {["milestone", "fixed", "hourly"].map((pt) => (
                                <Button key={pt} type="button"
                                  variant={termsForm.payment_type === pt ? "default" : "outline"}
                                  className={termsForm.payment_type === pt ? "bg-cyan-600 flex-1 capitalize" : "flex-1 capitalize"}
                                  onClick={() => setTermsForm({ ...termsForm, payment_type: pt })}>
                                  {pt}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Milestones</label>
                          {termsForm.milestones.map((m, idx) => (
                            <div key={idx} className="flex flex-wrap gap-2 items-start">
                              <Input
                                className="flex-1 min-w-[160px]"
                                placeholder="Milestone title"
                                value={m.title}
                                onChange={(e) => updateMilestoneRow(idx, "title", e.target.value)}
                              />
                              <Input
                                type="number"
                                min="0"
                                className="w-28"
                                placeholder="Amount"
                                value={m.amount}
                                onChange={(e) => updateMilestoneRow(idx, "amount", e.target.value)}
                              />
                              <Input
                                type="date"
                                className="w-40"
                                value={m.due_date}
                                onChange={(e) => updateMilestoneRow(idx, "due_date", e.target.value)}
                              />
                              {termsForm.milestones.length > 1 && (
                                <button type="button" onClick={() => removeMilestoneRow(idx)}
                                  className="text-gray-300 hover:text-red-500 mt-2">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <Button type="button" size="sm" variant="ghost" onClick={addMilestoneRow}>
                            <Plus className="h-4 w-4 mr-1" /> Add milestone
                          </Button>
                        </div>

                        <Textarea
                          placeholder="Optional note about these terms..."
                          value={termsForm.note}
                          onChange={(e) => setTermsForm({ ...termsForm, note: e.target.value })}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
                            <Send className="h-4 w-4 mr-1" />
                            {saving ? "Sending..." : "Send proposal"}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowTermsForm(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
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
