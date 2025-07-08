'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Filter, MoreVertical, Workflow, Calendar, User, Edit, Trash2, Copy, Star } from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, formatRelativeTime, IDate, Input, Label, parseTimespan, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea, useBackend, useInvoke } from '@tm9657/flow-like-ui'
import { useSearchParams } from 'next/navigation'

// Mock data - replace with your actual data fetching
const templates = [
    {
        id: '1',
        name: 'Customer Onboarding',
        description: 'Automated workflow for new customer registration and setup process',
        workflowName: 'customer-onboarding-v2',
        workflowVersion: 'v2.1',
        createdAt: '2024-03-15',
        author: 'John Doe',
        isStarred: true,
        tags: ['customer', 'automation'],
    },
    {
        id: '2',
        name: 'Invoice Processing',
        description: 'Streamlined invoice approval and payment processing workflow',
        workflowName: 'invoice-processor',
        workflowVersion: 'v1.3',
        createdAt: '2024-03-10',
        author: 'Jane Smith',
        isStarred: false,
        tags: ['finance', 'approval'],
    },
    {
        id: '3',
        name: 'Content Review',
        description: 'Multi-stage content review and approval process for marketing materials',
        workflowName: 'content-review-flow',
        workflowVersion: 'v3.0',
        createdAt: '2024-03-08',
        author: 'Mike Johnson',
        isStarred: true,
        tags: ['content', 'review'],
    },
    {
        id: '1',
        name: 'Customer Onboarding',
        description: 'Automated workflow for new customer registration and setup process',
        workflowName: 'customer-onboarding-v2',
        workflowVersion: 'v2.1',
        createdAt: '2024-03-15',
        author: 'John Doe',
        isStarred: true,
        tags: ['customer', 'automation'],
    },
    {
        id: '2',
        name: 'Invoice Processing',
        description: 'Streamlined invoice approval and payment processing workflow',
        workflowName: 'invoice-processor',
        workflowVersion: 'v1.3',
        createdAt: '2024-03-10',
        author: 'Jane Smith',
        isStarred: false,
        tags: ['finance', 'approval'],
    },
    {
        id: '3',
        name: 'Content Review',
        description: 'Multi-stage content review and approval process for marketing materials',
        workflowName: 'content-review-flow',
        workflowVersion: 'v3.0',
        createdAt: '2024-03-08',
        author: 'Mike Johnson',
        isStarred: true,
        tags: ['content', 'review'],
    },
]

const workflows = [
    { id: 'customer-onboarding-v2', name: 'Customer Onboarding V2', versions: ['v2.1', 'v2.0', 'v1.9'] },
    { id: 'invoice-processor', name: 'Invoice Processor', versions: ['v1.3', 'v1.2', 'v1.1'] },
    { id: 'content-review-flow', name: 'Content Review Flow', versions: ['v3.0', 'v2.8', 'v2.7'] },
    { id: 'user-registration', name: 'User Registration', versions: ['v1.0'] },
]

export default function TemplatesPage() {
    const backend = useBackend()
    const searchParams = useSearchParams();
    const appId = searchParams.get("id") ?? "";
    const [searchTerm, setSearchTerm] = useState('')
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
    const [selectedWorkflow, setSelectedWorkflow] = useState('')
    const boards = useInvoke(backend.boardState.getBoards, backend.boardState, [appId ?? ""], typeof appId === 'string')
    const templates = useInvoke(backend.templateState.getTemplates, backend.templateState, [appId ?? ""], typeof appId === 'string')
    const versions = useInvoke(
		backend.boardState.getBoardVersions,
		backend.boardState,
		[appId, selectedWorkflow],
		(selectedWorkflow ?? "") !== "" && isCreateDialogOpen,
	);
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        workflowId: '',
        workflowVersion: '',
    })

    const filteredTemplates = useMemo(() => {
        return templates.data?.filter(template =>
            template[2]?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template[2]?.description.toLowerCase().includes(searchTerm.toLowerCase())
        ) ?? []
    }, [templates.data, searchTerm])

    const handleCreateTemplate = () => {
        // Handle template creation logic here
        console.log('Creating template:', newTemplate)
        setIsCreateDialogOpen(false)
        setNewTemplate({ name: '', description: '', workflowId: '', workflowVersion: '' })
        setSelectedWorkflow('')
    }

    const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow)

    return (
        <main className="flex-col flex flex-grow max-h-full overflow-hidden p-6 space-y-8">
            {/* Header Section */}
            <div className="relative">
                <div className="absolute inset-0 bg-primary rounded-3xl opacity-10" />
                <div className="relative bg-card/80 backdrop-blur-sm rounded-3xl p-8 border shadow-xl">
                    <div className="flex items-center justify-between">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-bold text-primary">
                                Flow Templates
                            </h1>
                            <p className="text-muted-foreground text-lg">
                                Create, manage, and organize your workflow templates
                            </p>
                        </div>
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-200">
                                    <Plus className="w-5 h-5 mr-2" />
                                    Create Template
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Workflow className="w-5 h-5 text-primary" />
                                        Create New Template
                                    </DialogTitle>
                                    <DialogDescription>
                                        Create a reusable template from an existing workflow
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="template-name">Template Name</Label>
                                        <Input
                                            id="template-name"
                                            placeholder="Enter template name"
                                            value={newTemplate.name}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="template-description">Description</Label>
                                        <Textarea
                                            id="template-description"
                                            placeholder="Describe what this template does"
                                            value={newTemplate.description}
                                            onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="workflow-select">Source Workflow</Label>
                                        <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a workflow" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {boards.data?.map((workflow) => (
                                                    <SelectItem key={workflow.id} value={workflow.id}>
                                                        {workflow.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {selectedWorkflowData && (
                                        <div className="space-y-2">
                                            <Label htmlFor="version-select">Workflow Version</Label>
                                            <Select
                                                value={newTemplate.workflowVersion}
                                                onValueChange={(value) => setNewTemplate({ ...newTemplate, workflowVersion: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Latest" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="">Latest</SelectItem>
                                                    {selectedWorkflowData.versions.map((version) => (
                                                        <SelectItem key={version} value={version}>
                                                            {version}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            onClick={handleCreateTemplate}
                                            disabled={!newTemplate.name || !selectedWorkflow}
                                            className="flex-1"
                                        >
                                            Create Template
                                        </Button>
                                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                </Button>
            </div>

            {/* Templates Grid */}
            <div className='flex-1 overflow-auto'>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map(([appId, templateId, meta]) => (
                    <Card key={templateId} className="group hover:shadow-xl transition-all duration-300">
                        <CardHeader className="space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-primary/10 group-hover:bg-primary/30 rounded-lg">
                                        <Workflow className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                            {meta?.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p>
                                                {meta?.description || 'No description provided'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                            <Copy className="w-4 h-4 mr-2" />
                                            Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                                {meta?.long_description}
                            </p>

                            <div className="flex flex-wrap gap-1">
                                {meta?.tags.map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {meta?.created_at && <span>{formatRelativeTime(meta?.created_at as IDate)}</span>}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            </div>

            {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                    <Workflow className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
                    <p className="text-muted-foreground mb-6">
                        {searchTerm ? 'Try adjusting your search terms' : 'Create your first template to get started'}
                    </p>
                    {!searchTerm && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Template
                        </Button>
                    )}
                </div>
            )}
        </main>
    )
}