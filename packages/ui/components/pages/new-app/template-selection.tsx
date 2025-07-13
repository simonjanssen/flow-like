"use client"
import { Copy, CopyIcon, Grid } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Label } from "../../..";
import type { IMetadata } from "../../../lib";
import { AppTemplateFolder } from "./template-app-folder";
import { useTemplateFolders } from "./use-template-folder";

export function TemplateSection({
    templates,
    selectedTemplate,
    skipTemplate,
    onSelectTemplate,
    onSkipTemplate,
    onShowModal,
}: Readonly<{
    templates: [string, string, IMetadata | undefined][];
    selectedTemplate: [string, string];
    skipTemplate: boolean;
    onSelectTemplate: (appId: string, templateId: string) => void;
    onSkipTemplate: (skip: boolean) => void;
    onShowModal: () => void;
}>) {
    const templatesByApp = useTemplateFolders(templates);

    return (
        <Card className="border-2 hover:border-primary/20 transition-all duration-300">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <CopyIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                        <CardTitle>Start With A Template?</CardTitle>
                        <CardDescription>
                            Start with a pre-built template or create from scratch
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onShowModal}
                                className="gap-2"
                            >
                                <Grid className="h-4 w-4" />
                                Browse All
                            </Button>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="skip-template"
                                checked={skipTemplate}
                                onCheckedChange={(checked) => {
                                    onSkipTemplate(checked as boolean);
                                    if (checked) onSelectTemplate("", "");
                                }}
                            />
                            <Label htmlFor="skip-template" className="text-sm cursor-pointer">
                                Skip
                            </Label>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!skipTemplate && (
                    <div className="grid md:grid-cols-2 gap-4">
                        {templatesByApp.slice(0, 4).map(([appId, templates]) => (
                            <AppTemplateFolder
                                key={appId}
                                appId={appId}
                                templates={templates}
                                selectedTemplate={selectedTemplate}
                                onSelectTemplate={onSelectTemplate}
                            />
                        ))}

                        {templatesByApp.length > 3 && (
                            <div className="text-center">
                                <Button
                                    variant="ghost"
                                    onClick={onShowModal}
                                    className="text-sm text-muted-foreground hover:text-primary"
                                >
                                    +{templatesByApp.length - 3} more template folders
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {skipTemplate && (
                    <div className="text-center py-8 text-muted-foreground">
                        <Copy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Starting from a blank canvas</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
