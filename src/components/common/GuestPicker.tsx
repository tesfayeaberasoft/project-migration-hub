import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { money } from "@/lib/format";
import { q } from "@/lib/queries";
import { cn } from "@/lib/utils";
import type { GuestAccount } from "@/types";

/** Searchable guest selector (name, phone or username). Lists active guests by default. */
export function GuestPicker({
  value,
  onChange,
  includeInactive = false,
  placeholder = "Search guest by name or phone…",
}: {
  value?: string | undefined;
  onChange: (g: GuestAccount) => void;
  includeInactive?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useQuery(q.guestAccounts());
  const list = includeInactive ? data : data.filter((g) => g.status === "active");
  const selected = data.find((g) => g.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="h-12 w-full justify-between bg-surface px-4 font-normal">
          {selected ? (
            <span className="flex min-w-0 items-center gap-3">
              <UserRound className="h-4 w-4 text-primary" />
              <span className="truncate font-semibold">{selected.fullName}</span>
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">{selected.phone}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{isLoading ? "Loading guests…" : placeholder}</span>
          )}
          <ChevronsUpDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[300px] border-primary/20 p-0" align="start">
        <Command filter={(v, search) => (v.toLowerCase().replace(/\s/g, "").includes(search.toLowerCase().replace(/\s/g, "")) ? 1 : 0)}>
          <CommandInput placeholder="Name, phone or username…" />
          <CommandList>
            <CommandEmpty>No guest found.</CommandEmpty>
            <CommandGroup>
              {list.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`${g.fullName} ${g.phone} ${g.username}`}
                  onSelect={() => {
                    onChange(g);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Check className={cn("h-4 w-4 text-primary", g.id === value ? "opacity-100" : "opacity-0")} />
                    <div className="min-w-0">
                      <div className="truncate font-medium">{g.fullName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {g.phone} · @{g.username}
                      </div>
                    </div>
                  </div>
                  <div className={cn("shrink-0 text-right text-xs", g.exceedsLimit ? "text-destructive" : "text-muted-foreground")}>
                    {g.exceedsLimit ? "Over limit" : money(g.availableCredit)}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
