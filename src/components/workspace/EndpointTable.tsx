"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { getSwaggerUiUrl } from "@/lib/swaggerParser";

interface Endpoint {
  id: string;
  projectId: string;
  tag: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  swaggerLink: string;
  createdAt: any;
}

interface EndpointTableProps {
  data: Endpoint[];
  onReportBug?: (endpoint: Endpoint) => void;
}

export function EndpointTable({ data, onReportBug }: EndpointTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (path: string, id: string) => {
    navigator.clipboard.writeText(path);
    setCopiedId(id);
    toast.success("Path copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
      case "POST":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "PUT":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      case "DELETE":
        return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
      case "PATCH":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20";
    }
  };

  const columns: ColumnDef<Endpoint>[] = [
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => {
        const method = row.getValue("method") as string;
        return (
          <Badge variant="outline" className={`${getMethodBadgeColor(method)} font-extrabold text-[9px] w-14 tracking-wider justify-center uppercase`}>
            {method}
          </Badge>
        );
      },
    },
    {
      accessorKey: "path",
      header: "Endpoint Path",
      cell: ({ row }) => {
        const path = row.getValue("path") as string;
        const id = row.original.id;
        return (
          <div className="flex items-center gap-2 max-w-[240px] md:max-w-md">
            <code className="text-foreground text-[11px] font-semibold tracking-tight truncate bg-neutral-100 dark:bg-neutral-900/80 px-2 py-0.5 rounded-md font-mono border border-border">
              {path}
            </code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopy(path, id)}
              className="h-6 w-6 text-muted-foreground hover:text-foreground rounded shrink-0 cursor-pointer"
            >
              {copiedId === id ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "tag",
      header: "Tag",
      cell: ({ row }) => {
        const tag = row.getValue("tag") as string;
        return (
          <Badge variant="secondary" className="bg-neutral-100 dark:bg-neutral-900 border border-border text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 text-[9px] font-bold">
            {tag}
          </Badge>
        );
      },
    },
    {
      accessorKey: "summary",
      header: "Summary",
      cell: ({ row }) => {
        const summary = row.getValue("summary") as string;
        return (
          <span className="text-muted-foreground text-xs block max-w-xs truncate leading-relaxed" title={summary}>
            {summary || "—"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const endpoint = row.original;
        return (
          <div className="flex items-center gap-2">
            {endpoint.swaggerLink && (
              <a
                href={getSwaggerUiUrl(endpoint.swaggerLink)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground bg-card hover:bg-neutral-100 dark:hover:bg-neutral-900 border border-border rounded-lg transition-colors"
                title="Open in Swagger UI"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {onReportBug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReportBug(endpoint)}
                className="h-7 border-border hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs px-2.5 rounded-lg cursor-pointer transition-colors"
              >
                Report
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card/60 shadow-xs">
        <Table className="relative">
          <TableHeader className="bg-neutral-50/75 dark:bg-neutral-900/60 sticky top-0 z-10 shadow-xs border-b border-border backdrop-blur-xs">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b border-border hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="text-muted-foreground font-bold text-[10px] uppercase tracking-wider h-9">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="border-b border-border hover:bg-neutral-50/50 dark:hover:bg-neutral-950/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground text-xs"
                >
                  No endpoints found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-muted-foreground text-xs font-semibold px-1">
        <div>
          Showing page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount() || 1}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
