"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, Edit2, Search } from "lucide-react";
import type { CategoryEntity } from "../types";

interface CategoryListProps {
  categories: CategoryEntity[];
  onEditCategory: (category: CategoryEntity) => void;
}

export function CategoryList({ categories, onEditCategory }: CategoryListProps) {
  const [search, setSearch] = React.useState("");

  const filteredCategories = React.useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  return (
    <div className="space-y-4 text-left">
      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs bg-muted/20"
        />
      </div>

      {filteredCategories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <Tag className="size-8 mx-auto text-muted-foreground/60" />
          <h4 className="text-sm font-semibold text-foreground">No Categories Found</h4>
          <p className="text-xs text-muted-foreground">No categories match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCategories.map((cat) => (
            <Card
              key={cat.id}
              className="border-border hover:border-border/80 transition-shadow hover:shadow-xs bg-card"
            >
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="size-9 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xs"
                    style={{ backgroundColor: cat.color || "#3A5A40" }}
                  >
                    <Tag className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{cat.name}</p>
                      {cat.isDefault && (
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 px-1 border-kivo-sage text-kivo-brand-dark dark:text-kivo-sage"
                        >
                          System
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {cat.archived ? "Archived" : "Transaction category"}
                      {cat.parent ? " · Subcategory" : ""}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditCategory(cat)}
                  className="size-8 p-0 text-muted-foreground hover:text-foreground shrink-0"
                  aria-label={`Edit ${cat.name}`}
                >
                  <Edit2 className="size-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
