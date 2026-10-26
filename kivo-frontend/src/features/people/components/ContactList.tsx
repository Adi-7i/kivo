"use client";

import * as React from "react";
import { ContactCard } from "./ContactCard";
import { ContactAvatar } from "./ContactAvatar";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Users, RotateCcw, ArrowUpDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ContactEntity } from "../types";

interface ContactListProps {
  contacts: ContactEntity[];
  onAddContact?: () => void;
  onEditContact?: (contact: ContactEntity) => void;
}

type FilterOption = "all" | "receivable" | "payable" | "settled" | "roommates" | "archived";
type SortOption = "name" | "receivable_desc" | "payable_desc" | "recent";

export function ContactList({ contacts, onAddContact }: ContactListProps) {
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<FilterOption>("all");
  const [sort, setSort] = React.useState<SortOption>("name");

  // Filter contacts
  const filtered = React.useMemo(() => {
    return contacts.filter((c) => {
      // Search matching
      const query = search.toLowerCase().trim();
      const matchesSearch =
        !query ||
        c.displayName.toLowerCase().includes(query) ||
        (c.notes && c.notes.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Filter option
      switch (filter) {
        case "receivable":
          return c.receivablePaise > 0;
        case "payable":
          return c.payablePaise > 0;
        case "settled":
          return c.receivablePaise === 0 && c.payablePaise === 0 && !c.archived;
        case "roommates":
          return c.isRoommate;
        case "archived":
          return c.archived;
        case "all":
        default:
          return !c.archived; // Default "All" excludes archived unless specifically selected
      }
    });
  }, [contacts, search, filter]);

  // Sort contacts
  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sort) {
        case "receivable_desc":
          return b.receivablePaise - a.receivablePaise;
        case "payable_desc":
          return b.payablePaise - a.payablePaise;
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "name":
        default:
          return a.displayName.localeCompare(b.displayName);
      }
    });
  }, [filtered, sort]);

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts by name or notes..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort selector */}
          <div className="flex items-center gap-1.5 border border-border/80 rounded-md px-2.5 py-1.5 bg-card text-xs">
            <ArrowUpDown className="size-3.5 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-transparent text-xs text-foreground focus:outline-hidden cursor-pointer"
            >
              <option value="name">Name (A–Z)</option>
              <option value="receivable_desc">Highest Receivable</option>
              <option value="payable_desc">Highest Payable</option>
              <option value="recent">Recently Added</option>
            </select>
          </div>

          {onAddContact && (
            <Button
              onClick={onAddContact}
              size="sm"
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium"
            >
              <UserPlus className="size-3.5" />
              <span>Add Contact</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {(
          [
            { id: "all", label: "Active Contacts" },
            { id: "receivable", label: "Owes You" },
            { id: "payable", label: "You Owe" },
            { id: "settled", label: "Settled Up" },
            { id: "roommates", label: "Roommates" },
            { id: "archived", label: "Archived" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
              filter === tab.id
                ? "bg-kivo-primary text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-8 text-center space-y-3">
          <div className="size-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Users className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">No contacts found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {search
                ? `No contacts match "${search}". Try clearing your search query or switching filters.`
                : filter === "archived"
                  ? "No contacts have been archived yet."
                  : "You have not added any contacts yet. Add personal friends or flatmates to track shared money."}
            </p>
          </div>
          {(search || filter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="size-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border/80 bg-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Relationship</th>
                  <th className="py-3 px-4 text-right">Owed to You</th>
                  <th className="py-3 px-4 text-right">You Owe</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sorted.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <ContactAvatar name={c.displayName} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{c.displayName}</span>
                            {c.isRoommate && (
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0 px-1 border-kivo-sage text-kivo-brand-dark"
                              >
                                Roommate
                              </Badge>
                            )}
                            {c.archived && (
                              <Badge
                                variant="secondary"
                                className="text-[9px] py-0 px-1 opacity-70"
                              >
                                Archived
                              </Badge>
                            )}
                          </div>
                          {c.notes && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[260px]">
                              {c.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      {c.isRoommate ? "Flatmate / Roommate" : "Friend / Peer"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {c.receivablePaise > 0 ? (
                        <MoneyAmount paise={c.receivablePaise} size="sm" variant="income" />
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {c.payablePaise > 0 ? (
                        <MoneyAmount paise={c.payablePaise} size="sm" variant="reserved" />
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        prefetch={false}
                        href={`/people/${c.id}`}
                        className="inline-flex items-center gap-1 text-kivo-secondary hover:text-kivo-brand-dark dark:hover:text-kivo-sage font-medium"
                      >
                        <span>View</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Grid View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {sorted.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        </>
      )}

      {/* Aggregate Balance Callout */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground">Personal Claims & Balances</span>
          <p className="text-muted-foreground text-[11px]">
            Lending and shared advances are recoverable assets (receivables), not personal spending.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          What you owe and what others owe you stay separate.
        </p>
      </div>
    </div>
  );
}
