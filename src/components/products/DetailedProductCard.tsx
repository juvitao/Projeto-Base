import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Plus, Trash2, LayoutDashboard, Database, Repeat, Zap, HeartHandshake, Loader2, GripVertical, MoreVertical, X, ChevronDown, ChevronUp, Edit } from "lucide-react";
import { AgencyProduct, ProductFeature, useAgencyProducts, getPricingLabel, getPricingColor } from "@/hooks/useAgencyProducts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// DnD Imports
import {
    DndContext,
    closestCenter,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    useDroppable,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableFeatureItem } from "./SortableFeatureItem";
import { ProductFormModal } from "./ProductFormModal";

const DEFAULT_PILLARS = [
    { id: "Estratégico", label: "Estratégico", icon: "LayoutDashboard", color: "text-purple-500" },
    { id: "Ativos Shopify", label: "Ativos Shopify", icon: "Database", color: "text-blue-500" },
    { id: "Operacional Mensal", label: "Operacional Mensal", icon: "Repeat", color: "text-emerald-500" },
    { id: "Automações & Retenção", label: "Automações & Retenção", icon: "Zap", color: "text-yellow-500" },
    { id: "Suporte", label: "Suporte", icon: "HeartHandshake", color: "text-pink-500" },
    { id: "Geral", label: "Geral / Outros", icon: "Check", color: "text-gray-500" },
];

const ICON_MAP: any = {
    LayoutDashboard, Database, Repeat, Zap, HeartHandshake, Check
};

interface DetailedProductCardProps {
    product: AgencyProduct;
    defaultExpanded?: boolean;
}

function DroppableCategory({
    group,
    items,
    editingFeatureId,
    editingFeatureValue,
    setEditingFeatureId,
    setEditingFeatureValue,
    handleSaveFeature,
    handleDeleteFeature,
    handleCheckFeature,
    addingToCategory,
    setAddingToCategory,
    newFeatureName,
    setNewFeatureName,
    handleAddFeature,
    handleDeleteGroup
}: any) {
    const { setNodeRef } = useDroppable({
        id: group.id,
    });

    const Icon = ICON_MAP[group.icon || "Check"] || Check;

    return (
        <AccordionItem
            value={group.id}
            className={cn(
                "border border-l-4 rounded-lg bg-card/50 px-4 h-full transition-all",
                (group.color || "text-gray-500").replace("text-", "border-l-")
            )}
        >
            <div className="flex items-center justify-between pr-2">
                <AccordionTrigger className="hover:no-underline py-4 flex-1">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-secondary", (group.color || "text-gray-500").replace('text-', 'bg-') + '/10')}>
                            <Icon className={cn("w-5 h-5", group.color || "text-gray-500")} />
                        </div>
                        <span className="font-semibold text-foreground">{group.label}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">{items.length}</Badge>
                    </div>
                </AccordionTrigger>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-red-500 focus:text-red-600" onClick={() => handleDeleteGroup(group.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir Grupo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AccordionContent className="pt-0 pb-4 h-full">
                <div ref={setNodeRef} className="min-h-[50px]">
                    <SortableContext
                        id={group.id}
                        items={items.map((f: any) => f.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-1 pl-2">
                            {items.length === 0 && (
                                <div className="text-xs text-muted-foreground italic mb-2 ml-9 py-2 border-2 border-dashed border-muted rounded-md px-4 flex justify-center items-center h-16 bg-muted/20">
                                    Arraste itens para cá
                                </div>
                            )}

                            {items.map((feature: any) => (
                                <SortableFeatureItem
                                    key={feature.id}
                                    feature={feature}
                                    editingId={editingFeatureId}
                                    editingValue={editingFeatureValue}
                                    onEditStart={(id, val) => { setEditingFeatureId(id); setEditingFeatureValue(val); }}
                                    onEditCancel={() => setEditingFeatureId(null)}
                                    onEditSave={handleSaveFeature}
                                    onEditChange={setEditingFeatureValue}
                                    onDelete={handleDeleteFeature}
                                    onCheck={handleCheckFeature}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </div>

                <div className="mt-2 ml-9">
                    {addingToCategory === group.id ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={newFeatureName}
                                onChange={(e) => setNewFeatureName(e.target.value)}
                                placeholder="Novo item..."
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => e.key === "Enter" && handleAddFeature(group.id)}
                            />
                            <Button size="icon" variant="ghost" onClick={() => handleAddFeature(group.id)} className="h-8 w-8 hover:bg-green-500/10">
                                <Check className="w-4 h-4 text-green-500" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => { setAddingToCategory(null); setNewFeatureName(""); }} className="h-8 w-8 hover:bg-red-500/10">
                                <X className="w-4 h-4 text-red-500" />
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAddingToCategory(group.id)}
                            className="h-7 text-xs text-muted-foreground hover:text-primary px-2 -ml-2"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar item
                        </Button>
                    )}
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

export function DetailedProductCard({ product, defaultExpanded = true }: DetailedProductCardProps) {
    const { updateProduct, addFeature, updateFeature, updateFeaturesBatch, deleteFeature, deleteProduct } = useAgencyProducts();
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isEditingProduct, setIsEditingProduct] = useState(false);

    // State
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
    const [editingFeatureValue, setEditingFeatureValue] = useState("");
    const [newFeatureName, setNewFeatureName] = useState("");
    const [addingToCategory, setAddingToCategory] = useState<string | null>(null);

    // Group Management State
    const [newGroupName, setNewGroupName] = useState("");
    const [isAddingGroup, setIsAddingGroup] = useState(false);

    // Derived State
    const groups = useMemo(() => product.groups || DEFAULT_PILLARS, [product.groups]);
    const features = useMemo(() => product.features || [], [product.features]);

    // Local state for features to allow smooth drag updates before server sync
    const [items, setItems] = useState<ProductFeature[]>(features);

    useEffect(() => {
        setItems(features);
    }, [features]);

    // Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Calculate progress
    const totalFeatures = items.length;
    const completedFeatures = items.filter(f => f.is_checked).length;
    const progress = totalFeatures > 0 ? (completedFeatures / totalFeatures) * 100 : 0;

    // Actions
    const handleCheckFeature = async (feature: ProductFeature) => {
        // Optimistic update
        const updatedItems = items.map(f => f.id === feature.id ? { ...f, is_checked: !f.is_checked } : f);
        setItems(updatedItems);

        await updateFeature.mutateAsync({
            id: feature.id,
            is_checked: !feature.is_checked
        });
    };

    const handleSaveFeature = async (featureId: string) => {
        if (editingFeatureValue.trim()) {
            const updatedItems = items.map(f => f.id === featureId ? { ...f, name: editingFeatureValue.trim() } : f);
            setItems(updatedItems);

            await updateFeature.mutateAsync({ id: featureId, name: editingFeatureValue.trim() });
        }
        setEditingFeatureId(null);
        setEditingFeatureValue("");
    };

    const handleAddFeature = async (category: string) => {
        if (newFeatureName.trim()) {
            await addFeature.mutateAsync({
                productId: product.id,
                name: newFeatureName.trim(),
                category: category,
                is_checked: false
            });
            setNewFeatureName("");
            setAddingToCategory(null);
        }
    };

    const handleDeleteFeature = async (featureId: string) => {
        const updatedItems = items.filter(f => f.id !== featureId);
        setItems(updatedItems);
        await deleteFeature.mutateAsync(featureId);
    };

    // Group Management
    const handleAddGroup = async () => {
        if (newGroupName.trim()) {
            const newGroup = {
                id: newGroupName.trim(),
                label: newGroupName.trim(),
                icon: "Check",
                color: "text-gray-500"
            };
            const updatedGroups = [...groups, newGroup];
            await updateProduct.mutateAsync({ id: product.id, groups: updatedGroups });
            setNewGroupName("");
            setIsAddingGroup(false);
        }
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (confirm("Tem certeza? Itens neste grupo serão movidos para 'Geral'.")) {
            // Update items to 'Geral' first? Or just let them be orphaned (default category logic needed)
            // Ideally move them to 'Geral'
            const itemsInGroup = items.filter(f => (f.category || 'Geral') === groupId);
            if (itemsInGroup.length > 0) {
                const batchUpdates = itemsInGroup.map(item => ({ id: item.id, category: 'Geral' }));
                await updateFeaturesBatch.mutateAsync(batchUpdates);
            }

            const updatedGroups = groups.filter(g => g.id !== groupId);
            await updateProduct.mutateAsync({ id: product.id, groups: updatedGroups });
        }
    };

    // DnD Handlers
    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the containers
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) {
            return;
        }

        setItems((prev) => {
            const activeItems = prev.filter(f => (f.category || 'Geral') === activeContainer);
            const overItems = prev.filter(f => (f.category || 'Geral') === overContainer);

            const activeIndex = activeItems.findIndex(f => f.id === activeId);
            const overIndex = overItems.findIndex(f => f.id === overId);

            let newIndex;
            if (overIndex >= 0) {
                newIndex = overIndex;
            } else {
                newIndex = overItems.length;
            }

            return prev.map(item => {
                if (item.id === activeId) {
                    return { ...item, category: overContainer, sort_order: newIndex };
                }
                return item;
            });
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (activeContainer && overContainer) {
            // Reordering within the same container
            if (activeContainer === overContainer) {
                const activeIndex = items.findIndex((i) => i.id === activeId);
                const overIndex = items.findIndex((i) => i.id === overId);

                if (activeIndex !== overIndex) {
                    const newItems = arrayMove(items, activeIndex, overIndex);
                    setItems(newItems);

                    // Persist for ALL items in this container in one batch
                    const containerItems = newItems.filter(f => (f.category || 'Geral') === activeContainer);
                    const batchUpdates = containerItems.map((item, idx) => ({
                        id: item.id,
                        sort_order: idx
                    }));

                    await updateFeaturesBatch.mutateAsync(batchUpdates);
                }
            }
            // Moving to different container
            else {
                const movedItem = items.find(f => f.id === activeId);
                if (movedItem) {
                    // Collect batch updates for BOTH affected containers if possible,
                    // but for simplicity, let's just update the moved item and its new container
                    const containerItems = items.filter(f => (f.category || 'Geral') === overContainer);
                    const batchUpdates = containerItems.map((item, idx) => ({
                        id: item.id,
                        category: overContainer,
                        sort_order: idx
                    }));

                    await updateFeaturesBatch.mutateAsync(batchUpdates);
                }
            }
        }
    };

    const findContainer = (id: string) => {
        if (groups.find(g => g.id === id)) return id;
        const item = items.find(f => f.id === id);
        return item ? (item.category || 'Geral') : null;
    };

    // Get theme based on category
    const categoryTheme = useMemo(() => {
        if (product.is_flagship) return {
            bg: "from-[#1A0B2E] to-[#11051F]",
            border: "from-purple-600 via-pink-600 to-purple-600",
            accent: "text-purple-400",
            badge: "bg-purple-500/10 text-purple-400 border-purple-500/20",
            progress: "bg-gradient-to-r from-purple-500 to-pink-500"
        };
        if (product.category === 'fixed') return {
            bg: "from-[#061F12] to-[#04140C]",
            border: "from-emerald-600 via-green-600 to-emerald-600",
            accent: "text-emerald-400",
            badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
            progress: "bg-gradient-to-r from-emerald-500 to-green-500"
        };
        if (product.category === 'avulso') return {
            bg: "from-[#0B1A2E] to-[#05111F]",
            border: "from-blue-600 via-cyan-600 to-blue-600",
            accent: "text-blue-400",
            badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
            progress: "bg-gradient-to-r from-blue-500 to-cyan-500"
        };
        return {
            bg: "from-gray-900 to-black",
            border: "from-gray-600 to-gray-800",
            accent: "text-gray-400",
            badge: "bg-gray-500/10 text-gray-400 border-gray-500/20",
            progress: "bg-gray-500"
        };
    }, [product.category, product.is_flagship]);

    return (
        <div className="w-full bg-card border rounded-xl overflow-hidden shadow-sm">
            {/* Header Section */}
            <div className={cn("relative p-8 bg-gradient-to-br border-b border-white/5", categoryTheme.bg)}>
                <div className={cn("absolute top-0 left-0 w-full h-1 bg-gradient-to-r", categoryTheme.border)} />

                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-1 truncate">
                        <div className="flex items-center gap-3 mb-4">
                            {product.is_flagship && (
                                <Badge variant="secondary" className={categoryTheme.badge}>Solução Completa</Badge>
                            )}
                            <Badge variant="outline" className={cn("bg-background/5 text-xs text-white border-white/10")}>
                                {getPricingLabel(product.pricing_type)}
                            </Badge>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2 truncate">{product.name}</h2>
                        <p className="text-gray-400 max-w-2xl text-sm line-clamp-2">{product.description}</p>
                    </div>

                    <div className="flex flex-col gap-4 w-full md:w-auto min-w-[280px]">
                        {/* Control Icons in horizontal line */}
                        <div className="flex items-center justify-end gap-1">
                            <ProductFormModal
                                open={isEditingProduct}
                                onOpenChange={setIsEditingProduct}
                                product={product}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-400 hover:text-white hover:bg-white/10 h-9 w-9"
                                        onClick={() => setIsEditingProduct(true)}
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                }
                            />

                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-white hover:bg-white/10 h-9 w-9"
                                onClick={() => setIsExpanded(!isExpanded)}
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-9 w-9">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            O produto <strong>{product.name}</strong> será excluído permanentemente.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deleteProduct.mutateAsync(product.id)}
                                            className="bg-red-500 hover:bg-red-600"
                                        >
                                            Excluir
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        {/* Progress below icons */}
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Progresso</span>
                                <span className={cn("text-xl font-bold", categoryTheme.accent)}>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-1.5 bg-white/10" indicatorClassName={categoryTheme.progress} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            {isExpanded && (
                <div className="p-6 animate-in slide-in-from-top-4 duration-300">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={rectIntersection}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <Accordion type="multiple" defaultValue={groups.map(g => g.id)} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                            {groups.map((group) => {
                                const groupItems = items.filter(f => (f.category || 'Geral') === group.id);
                                return (
                                    <DroppableCategory
                                        key={group.id}
                                        group={group}
                                        items={groupItems}
                                        editingFeatureId={editingFeatureId}
                                        editingFeatureValue={editingFeatureValue}
                                        setEditingFeatureId={setEditingFeatureId}
                                        setEditingFeatureValue={setEditingFeatureValue}
                                        handleSaveFeature={handleSaveFeature}
                                        handleDeleteFeature={handleDeleteFeature}
                                        handleCheckFeature={handleCheckFeature}
                                        addingToCategory={addingToCategory}
                                        setAddingToCategory={setAddingToCategory}
                                        newFeatureName={newFeatureName}
                                        setNewFeatureName={setNewFeatureName}
                                        handleAddFeature={handleAddFeature}
                                        handleDeleteGroup={handleDeleteGroup}
                                    />
                                );
                            })}

                            {/* Add New Group Button */}
                            <div className="border border-dashed rounded-lg bg-muted/20 px-4 py-8 flex items-center justify-center min-h-[200px]">
                                {isAddingGroup ? (
                                    <div className="flex items-center gap-2 w-full max-w-xs">
                                        <Input
                                            value={newGroupName}
                                            onChange={(e) => setNewGroupName(e.target.value)}
                                            placeholder="Nome do grupo..."
                                            className="h-9"
                                            autoFocus
                                            onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                                        />
                                        <Button size="icon" variant="ghost" onClick={handleAddGroup}>
                                            <Check className="w-4 h-4 text-green-500" />
                                        </Button>
                                        <Button size="icon" variant="ghost" onClick={() => setIsAddingGroup(false)}>
                                            <X className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="outline" onClick={() => setIsAddingGroup(true)} className="gap-2">
                                        <Plus className="w-4 h-4" />
                                        Criar Novo Grupo
                                    </Button>
                                )}
                            </div>
                        </Accordion>

                        <DragOverlay>
                            {activeId ? (
                                <SortableFeatureItem
                                    feature={items.find(f => f.id === activeId) as ProductFeature}
                                    editingId={null}
                                    editingValue=""
                                    onEditStart={() => { }}
                                    onEditCancel={() => { }}
                                    onEditSave={() => { }}
                                    onEditChange={() => { }}
                                    onDelete={() => { }}
                                    onCheck={() => { }}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                </div>
            )}
        </div>
    );
}
