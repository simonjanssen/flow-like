"use client"
import { Check, Copy, Workflow } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Badge, Card, CardContent } from "../../..";
import type { IMetadata } from "../../../lib";

export function TemplateCard({
    appId,
    templateId,
    metadata,
    selected,
    onSelect,
    compact = false,
}: Readonly<{
    appId: string;
    templateId: string;
    metadata: IMetadata;
    selected: boolean;
    onSelect: () => void;
    compact?: boolean;
}>) {
    return (
        <Card
            className={`cursor-pointer transition-all duration-300 ${
                compact ? "hover:shadow-sm" : "hover:shadow-lg hover:-translate-y-1"
            } ${
                selected
                    ? "ring-2 ring-primary shadow-lg shadow-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
                    : "hover:border-primary/30"
            }`}
            onClick={onSelect}
        >
            <CardContent className={compact ? "p-3" : "p-4"}>
                <div className={`flex items-center gap-3 ${compact ? "mb-2" : "mb-3"}`}>
                    <Avatar className={`${compact ? "h-8 w-8" : "h-12 w-12"} shadow-sm`}>
                        <AvatarImage src={metadata.icon ?? ""} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                            <Copy className={compact ? "h-3 w-3" : "h-6 w-6"} />
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <h3 className={`font-semibold truncate ${compact ? "text-sm" : ""}`}>
                            {metadata?.name}
                        </h3>
                        <Badge
                            variant={selected ? "default" : "secondary"}
                            className={"text-xs"}
                        >
                            <Workflow className="h-3 w-3 mr-1" />
                            Template
                        </Badge>
                    </div>
                    {selected && (
                        <div className="p-1.5 bg-primary rounded-full">
                            <Check className="h-4 w-4 text-primary-foreground" />
                        </div>
                    )}
                </div>
                <p className={`text-muted-foreground line-clamp-2 ${compact ? "text-xs" : "text-sm"}`}>
                    {metadata?.description}
                </p>
            </CardContent>
        </Card>
    );
}