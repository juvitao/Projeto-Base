import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { ProductFeature } from "@/hooks/useAgencyProducts";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Pencil, Trash2, X, GripVertical } from "lucide-react";

interface SortableFeatureItemProps {
    feature: ProductFeature;
    editingId: string | null;
    editingValue: string;
    onEditStart: (id: string, name: string) => void;
    onEditCancel: () => void;
    onEditSave: (id: string) => void;
    onEditChange: (value: string) => void;
    onDelete: (id: string) => void;
    onCheck: (feature: ProductFeature) => void;
}

export function SortableFeatureItem({
    feature,
    editingId,
    editingValue,
    onEditStart,
    onEditCancel,
    onEditSave,
    onEditChange,
    onDelete,
    onCheck
}: SortableFeatureItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: feature.id, data: { type: 'feature', feature } });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-start gap-3 py-1.5 hover:bg-muted/30 rounded-md px-2 transition-colors touch-none",
                isDragging && "bg-muted/50"
            )}
        >
            {editingId === feature.id ? (
                <div className="flex-1 flex items-center gap-2">
                    <Input
                        value={editingValue}
                        onChange={(e) => onEditChange(e.target.value)}
                        className="h-7 text-sm"
                        autoFocus
                        onKeyDown={(e) => e.key === "Enter" && onEditSave(feature.id)}
                    />
                    <Button size="icon" variant="ghost" onClick={() => onEditSave(feature.id)} className="h-7 w-7">
                        <Check className="w-3 h-3 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={onEditCancel} className="h-7 w-7">
                        <X className="w-3 h-3 text-red-500" />
                    </Button>
                </div>
            ) : (
                <>
                    {/* Drag Handle */}
                    <div {...attributes} {...listeners} className="mt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <Checkbox
                        checked={feature.is_checked}
                        onCheckedChange={() => onCheck(feature)}
                        className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary border-muted-foreground/30"
                    />

                    <div className="flex-1 min-w-0 flex items-center justify-between group/item">
                        <span className={cn(
                            "text-sm transition-all break-words",
                            feature.is_checked ? "text-muted-foreground line-through opacity-70" : "text-foreground"
                        )}>
                            {feature.name}
                        </span>
                        <div className="flex opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onEditStart(feature.id, feature.name)}
                                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            >
                                <Pencil className="w-3 h-3" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onDelete(feature.id)}
                                className="h-6 w-6 text-muted-foreground hover:text-red-500"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
