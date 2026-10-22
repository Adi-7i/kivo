import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TransactionPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function TransactionPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TransactionPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs text-muted-foreground border-t border-border/60">
      <div>
        Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
        <span className="font-semibold text-foreground">{endItem}</span> of{" "}
        <span className="font-semibold text-foreground">{totalItems}</span> transactions
      </div>

      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="gap-1 text-xs"
        >
          <ChevronLeft className="size-3" />
          <span>Previous</span>
        </Button>

        <span className="px-2 text-xs font-medium text-foreground">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="gap-1 text-xs"
        >
          <span>Next</span>
          <ChevronRight className="size-3" />
        </Button>
      </div>
    </div>
  );
}
