import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Dropdown, DropdownLabel } from './Dropdown.jsx';
import { Chip } from './Chip.jsx';
import { cn } from '~/lib/utils';

const TILE_GRADIENTS = [
    'from-coral to-pink',
    'from-violet to-pink',
    'from-lime to-[#7ee0b5]',
    'from-[#7cc4ff] to-violet',
    'from-[#ffc24d] to-coral',
];

function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
}

// Colored monogram tile so each model is recognizable at a glance.
export function ModelTile({ model, className }) {
    const gradient = TILE_GRADIENTS[hash(model.family || model.name || model.id) % TILE_GRADIENTS.length];
    return (
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-display text-sm font-extrabold text-ink', gradient, className)}>
            {(model.name || model.id).charAt(0).toUpperCase()}
        </span>
    );
}

/**
 * Searchable model menu.
 * `groups`: [{ label?, models: [{ id, name, family? }] }]
 */
export function ModelPicker({ groups, value, onChange, width = 340 }) {
    const [query, setQuery] = useState('');
    const all = useMemo(() => groups.flatMap(g => g.models), [groups]);
    const current = all.find(m => m.id === value);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return groups;
        return groups
            .map(g => ({ ...g, models: g.models.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)) }))
            .filter(g => g.models.length);
    }, [groups, query]);

    return (
        <Dropdown
            width={width}
            onOpenChange={(open) => { if (!open) setQuery(''); }}
            trigger={({ open, toggle }) => (
                <Chip
                    active={open}
                    onClick={toggle}
                    icon={current ? <ModelTile model={current} className="size-5 rounded-md text-[10px]" /> : null}
                    label={current?.name || 'Pick a model'}
                    className="pl-1.5"
                />
            )}
        >
            {({ close }) => (
                <>
                    <label className="mx-1 mt-1 mb-2 flex items-center gap-2.5 rounded-2xl border border-line bg-white/[0.03] px-3.5 py-2.5 focus-within:border-violet/60">
                        <Search className="size-4 text-fg-faint" />
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Search ${all.length} models…`}
                            className="w-full bg-transparent text-sm text-fg placeholder:text-fg-faint focus:outline-none"
                        />
                    </label>
                    <div className="-mr-1 flex flex-col overflow-y-auto pr-1 pb-1">
                        {filtered.length === 0 && <p className="px-3 py-6 text-center text-sm text-fg-faint">No model matches “{query}”.</p>}
                        {filtered.map((group, gi) => (
                            <div key={group.label || gi} className="flex flex-col gap-0.5">
                                {group.label && <DropdownLabel>{group.label}</DropdownLabel>}
                                {group.models.map((m) => {
                                    const selected = m.id === value;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => { onChange(m.id); close(); }}
                                            className={cn(
                                                'flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors',
                                                selected ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'
                                            )}
                                        >
                                            <ModelTile model={m} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium text-fg">{m.name}</span>
                                                {m.hint && <span className="block truncate text-xs text-fg-faint">{m.hint}</span>}
                                            </span>
                                            {selected && <Check className="size-4 shrink-0 text-lime" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </Dropdown>
    );
}
