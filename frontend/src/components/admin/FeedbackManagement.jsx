import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCcw, 
  Filter, 
  ChevronRight, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MoreHorizontal,
  User,
  Mail,
  Phone,
  Calendar,
  Flag,
  UserPlus,
  ArrowRight,
  BarChart3,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  FileText
} from 'lucide-react';
import { adminAPI } from '../../api/wallet';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "../ui/select";

const FeedbackManagement = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('analytics');
  const [feedbacks, setFeedbacks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetails, setCaseDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    status: 'All',
    category: 'All',
    priority: 'All'
  });

  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 10,
    total: 0
  });

  const [updateData, setUpdateData] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    internal_note: ''
  });

  useEffect(() => {
    fetchStats();
    fetchFeedbacks();
  }, [pagination.skip, filters]);

  const fetchStats = async () => {
    try {
      const data = await adminAPI.getFeedbackStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch feedback stats:', err);
    }
  };

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const params = {
        skip: pagination.skip,
        limit: pagination.limit,
        search: search
      };
      if (filters.status !== 'All') params.status = filters.status;
      if (filters.category !== 'All') params.category = filters.category;
      if (filters.priority !== 'All') params.priority = filters.priority;

      const data = await adminAPI.getFeedbacks(params);
      setFeedbacks(data.feedbacks || []);
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load feedbacks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCase = async (caseId) => {
    setDetailsLoading(true);
    setSelectedCase(caseId);
    try {
      const data = await adminAPI.getFeedbackById(caseId);
      setCaseDetails(data);
      setUpdateData({
        status: data.status,
        priority: data.priority,
        assigned_to: data.assigned_to || '',
        internal_note: ''
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load case details",
        variant: "destructive"
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdateCase = async () => {
    try {
      const payload = {
        status: updateData.status,
        priority: updateData.priority,
        assigned_to: updateData.assigned_to
      };
      if (updateData.internal_note) {
        payload.internal_note = updateData.internal_note;
      }

      await adminAPI.updateFeedback(caseDetails.id, payload);
      toast({
        title: "Success",
        description: "Case updated successfully"
      });
      fetchFeedbacks();
      fetchStats();
      handleViewCase(caseDetails.id); // Refresh details
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update case",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">New</Badge>;
      case 'Under Review': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Under Review</Badge>;
      case 'Acknowledged': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Acknowledged</Badge>;
      case 'Escalated': return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Escalated</Badge>;
      case 'Resolved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Resolved</Badge>;
      case 'Closed': return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Low': return <Badge variant="outline" className="bg-slate-50 text-slate-600">Low</Badge>;
      case 'Medium': return <Badge variant="outline" className="bg-blue-50 text-blue-600">Medium</Badge>;
      case 'High': return <Badge variant="outline" className="bg-orange-50 text-orange-600">High</Badge>;
      case 'Urgent': return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 animate-pulse">URGENT</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Feedback Management</h2>
          <p className="text-muted-foreground">Browse, filter and manage all feedback cases</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { fetchStats(); fetchFeedbacks(); }}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="analytics" className="data-[state=active]:bg-white">Analytics</TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-white">All Feedback</TabsTrigger>
          <TabsTrigger value="complaints" className="data-[state=active]:bg-white">Complaints</TabsTrigger>
          <TabsTrigger value="support" className="data-[state=active]:bg-white">Technical / Support</TabsTrigger>
          <TabsTrigger value="abandoned" className="data-[state=active]:bg-white">Abandoned Postings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.avg_resolution_time || '0h'}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Escalation Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.escalation_rate || '0%'}</div>
                <p className="text-xs text-muted-foreground">Of all cases</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
                <RefreshCcw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.recovery_rate || '0%'}</div>
                <p className="text-xs text-muted-foreground">Abandoned forms</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positive/Negative</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.rating_ratio || '0:0'}</div>
                <p className="text-xs text-muted-foreground">Rating ratio</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feedback by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(stats?.categories || {}).map(([category, count]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ width: `${(count / (stats?.total_cases || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!stats?.categories || Object.keys(stats.categories).length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">No category data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Most Complained-About Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">Analytics coming soon</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* List Content for all tabs */}
        <TabsContent value={activeTab} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, name, email, job ID..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchFeedbacks()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                  <SelectItem value="Escalated">Escalated</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.category} onValueChange={(v) => setFilters(f => ({ ...f, category: v }))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  <SelectItem value="Complaint">Complaint</SelectItem>
                  <SelectItem value="Technical Support">Technical Support</SelectItem>
                  <SelectItem value="Payment & Billing">Payment & Billing</SelectItem>
                  <SelectItem value="Account Issues">Account Issues</SelectItem>
                  <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                  <SelectItem value="Feedback & Suggestions">Feedback & Suggestions</SelectItem>
                  <SelectItem value="Abandoned Postings">Abandoned Postings</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={() => {
                setSearch('');
                setFilters({ status: 'All', category: 'All', priority: 'All' });
              }}>
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Case ID</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">Loading feedbacks...</TableCell>
                  </TableRow>
                ) : feedbacks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">No feedbacks found</TableCell>
                  </TableRow>
                ) : feedbacks.map((item) => (
                  <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewCase(item.case_id)}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{item.case_id}</span>
                        {item.is_flagged && <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider">🚩 FLAGGED</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-xs text-muted-foreground">{item.subcategory || 'General'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{item.user?.name}</span>
                        <span className="text-xs text-muted-foreground">{item.user?.user_type || 'Visitor'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{item.job_id || '—'}</span>
                    </TableCell>
                    <TableCell>
                      {item.rating ? (
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < item.rating ? 'fill-current' : 'text-slate-200'}>★</span>
                          ))}
                          <span className="ml-1 text-xs text-muted-foreground">{item.rating}/5</span>
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleViewCase(item.case_id); }}>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Case Details Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          {detailsLoading ? (
            <div className="p-12 text-center">Loading case details...</div>
          ) : caseDetails && (
            <>
              <DialogHeader className="p-6 pb-2 border-b bg-slate-50">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Feedback Case</p>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                      {caseDetails.case_id}
                      <Badge variant="secondary" className="font-normal">{caseDetails.category}</Badge>
                    </DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">{caseDetails.subject || 'No subject'}</p>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(caseDetails.status)}
                    {getPriorityBadge(caseDetails.priority)}
                    {caseDetails.is_flagged && <Badge variant="destructive">FLAGGED</Badge>}
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-hidden flex">
                <ScrollArea className="flex-1 p-6 border-r">
                  <Tabs defaultValue="info" className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-6">
                      <TabsTrigger value="info" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-2 px-4">Case Info</TabsTrigger>
                      <TabsTrigger value="feedback" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-2 px-4">Feedback</TabsTrigger>
                      <TabsTrigger value="internal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-2 px-4">Internal</TabsTrigger>
                      <TabsTrigger value="timeline" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent py-2 px-4">Timeline</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-6">
                      <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Case Information</h4>
                          <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="text-slate-500">Case ID</span>
                            <span className="font-medium">{caseDetails.case_id}</span>
                            <span className="text-slate-500">Category</span>
                            <span className="font-medium">{caseDetails.category}</span>
                            <span className="text-slate-500">Source</span>
                            <span className="font-medium flex items-center gap-1.5 capitalize">
                              <FileText className="w-3.5 h-3.5" />
                              {caseDetails.source?.replace('_', ' ')}
                            </span>
                            <span className="text-slate-500">Assigned To</span>
                            <span className="font-medium">{caseDetails.assigned_to || 'Unassigned'}</span>
                            <span className="text-slate-500">Created</span>
                            <span className="font-medium">{new Date(caseDetails.created_at).toLocaleString()}</span>
                            <span className="text-slate-500">Last Updated</span>
                            <span className="font-medium">{new Date(caseDetails.updated_at).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Submitter Details</h4>
                          <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                            <span className="text-slate-500">Type</span>
                            <span className="font-medium">{caseDetails.user?.user_type}</span>
                            <span className="text-slate-500">Name</span>
                            <span className="font-medium">{caseDetails.user?.name}</span>
                            <span className="text-slate-500">Email</span>
                            <span className="font-medium text-blue-600 underline">{caseDetails.user?.email}</span>
                            <span className="text-slate-500">Phone</span>
                            <span className="font-medium">{caseDetails.user?.phone || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t space-y-4">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Actions</h4>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm">
                            <UserPlus className="w-4 h-4 mr-2" />
                            Assign
                          </Button>
                          <Button variant="outline" size="sm">
                            <Clock className="w-4 h-4 mr-2" />
                            Status
                          </Button>
                          <Button variant="outline" size="sm">
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Request Info
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            Escalate
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Mark Resolved
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="feedback" className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="font-bold text-lg">{caseDetails.subject || 'Message Content'}</h3>
                          {caseDetails.rating && (
                            <div className="flex items-center gap-1 text-amber-500">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < caseDetails.rating ? 'fill-current' : 'text-slate-200 text-xl'}>★</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {caseDetails.message}
                        </p>
                      </div>

                      {caseDetails.job_id && (
                        <Card>
                          <CardHeader className="py-3 px-4 bg-muted/30">
                            <CardTitle className="text-sm">Linked Job</CardTitle>
                          </CardHeader>
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{caseDetails.job_id}</span>
                              <Button variant="link" size="sm" className="h-auto p-0">
                                View Job <ExternalLink className="w-3 h-3 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="internal" className="space-y-4">
                      <div className="space-y-4">
                        {caseDetails.internal_notes?.length > 0 ? (
                          caseDetails.internal_notes.map((note) => (
                            <div key={note.id} className="bg-amber-50/50 border border-amber-100 p-4 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-amber-200 flex items-center justify-center text-[10px] font-bold">
                                    {note.added_by?.charAt(0)}
                                  </div>
                                  <span className="text-sm font-semibold">{note.added_by}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{new Date(note.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-slate-700">{note.note}</p>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 border-2 border-dashed rounded-lg">
                            <p className="text-sm text-slate-400">No internal notes yet</p>
                          </div>
                        )}
                        
                        <div className="pt-4 space-y-2">
                          <label className="text-sm font-medium">Add Internal Note</label>
                          <textarea 
                            className="w-full min-h-[100px] p-3 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Type internal note here..."
                            value={updateData.internal_note}
                            onChange={(e) => setUpdateData(prev => ({ ...prev, internal_note: e.target.value }))}
                          />
                          <Button size="sm" onClick={handleUpdateCase} disabled={!updateData.internal_note}>
                            Add Note
                          </Button>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-4">
                      <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {caseDetails.timeline?.map((item, idx) => (
                          <div key={item.id} className="relative">
                            <div className={`absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                              idx === 0 ? 'bg-green-500 shadow-[0_0_0_2px_rgba(34,197,94,0.2)]' : 'bg-slate-400'
                            }`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold">{item.action}</span>
                              <span className="text-xs text-slate-500">{item.performed_by} • {new Date(item.created_at).toLocaleString()}</span>
                              <p className="text-sm text-slate-600 mt-1">{item.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>

                <div className="w-72 bg-slate-50 p-6 flex flex-col gap-6 border-l overflow-y-auto">
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Update Case</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Status</label>
                      <Select value={updateData.status} onValueChange={(v) => setUpdateData(prev => ({ ...prev, status: v }))}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="New">New</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Acknowledged">Acknowledged</SelectItem>
                          <SelectItem value="Escalated">Escalated</SelectItem>
                          <SelectItem value="Resolved">Resolved</SelectItem>
                          <SelectItem value="Closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Priority</label>
                      <Select value={updateData.priority} onValueChange={(v) => setUpdateData(prev => ({ ...prev, priority: v }))}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Assign To</label>
                      <Input 
                        placeholder="Admin name" 
                        className="h-9 text-sm"
                        value={updateData.assigned_to}
                        onChange={(e) => setUpdateData(prev => ({ ...prev, assigned_to: e.target.value }))}
                      />
                    </div>

                    <Button className="w-full mt-2" onClick={handleUpdateCase}>
                      Update Case
                    </Button>
                  </div>

                  <div className="pt-6 border-t space-y-3">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Quick Flags</h4>
                    <div className="space-y-2">
                      <Button 
                        variant="outline" 
                        className={`w-full justify-start text-sm h-9 ${caseDetails.is_flagged ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
                        onClick={() => adminAPI.updateFeedback(caseDetails.id, { is_flagged: !caseDetails.is_flagged }).then(() => handleViewCase(caseDetails.id))}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        {caseDetails.is_flagged ? 'Unflag Case' : 'Flag for Attention'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagement;
