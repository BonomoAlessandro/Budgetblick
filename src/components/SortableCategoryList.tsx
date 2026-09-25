import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRef, useState, type KeyboardEventHandler } from 'react';
import { reorderIds } from '../lib/categoryOrder';
import type { Category } from '../types';
import { EditButton, type CategoryListProps } from './CategoryList';
import { Icon } from './Icon';
import { categoryListClass } from './styles';

/*
 * Eigene Datei, damit dnd-kit erst mit den Einstellungen nachgeladen wird
 * und nicht im Haupt-Bundle landet.
 */

/** Touch: so lange gedrückt halten, bevor gezogen wird – kürzer ist Tippen, Wischen scrollt. */
const TOUCH_HOLD_MS = 250;

/** Nur senkrecht ziehen. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

function SortableRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });
  // Maus und Touch starten das Ziehen auf der ganzen Zeile, die Tastatur nur am Griff:
  // Enter/Leertaste auf dem Namen öffnen weiterhin die Bearbeitung.
  const { onKeyDown, ...pointerListeners } = listeners ?? {};
  return (
    <li
      ref={setNodeRef}
      {...pointerListeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`relative flex select-none items-center bg-white pr-2 [-webkit-touch-callout:none] dark:bg-slate-900 ${
        isDragging
          ? 'z-10 cursor-grabbing rounded-xl shadow-lg ring-1 ring-slate-200 dark:ring-slate-700'
          : ''
      }`}
    >
      <EditButton category={category} onEdit={onEdit} />
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        onKeyDown={onKeyDown as KeyboardEventHandler | undefined}
        aria-label={`${category.name} verschieben`}
        className="flex size-11 shrink-0 cursor-grab items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 active:cursor-grabbing dark:hover:bg-slate-800"
      >
        <Icon name="grip" className="size-5" strokeWidth={3} />
      </button>
    </li>
  );
}

/**
 * Kategorienliste mit Drag-and-drop: Maus ziehen, auf dem Handy kurz gedrückt halten
 * und ziehen. Tastatur am Griff: Leertaste aufnehmen, Pfeiltasten verschieben,
 * Leertaste ablegen. Kurzes Tippen/Klicken öffnet wie gewohnt die Bearbeitung.
 */
export function SortableCategoryList({
  categories,
  onEdit,
  onReorder,
}: CategoryListProps & { onReorder: (order: string[]) => void }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: TOUCH_HOLD_MS, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = categories.map((c) => c.id);
  const baseKey = ids.join();
  // Neue Reihenfolge sofort zeigen, bis die gespeicherte aus der Datenbank zurückkommt
  // (sonst springt die Zeile kurz an den alten Platz zurück).
  const [pending, setPending] = useState<{ base: string; order: string[] } | null>(null);
  const order = pending?.base === baseKey ? pending.order : ids;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const nameOf = (id: string | number) => byId.get(String(id))?.name ?? '';
  const position = (id: string | number) => order.indexOf(String(id)) + 1;

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `${nameOf(active.id)} aufgenommen, Platz ${position(active.id)} von ${order.length}.`,
    onDragOver: ({ active, over }) =>
      over ? `${nameOf(active.id)} über Platz ${position(over.id)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${nameOf(active.id)} auf Platz ${position(over.id)} abgelegt.`
        : `${nameOf(active.id)} abgelegt.`,
    onDragCancel: ({ active }) => `Verschieben abgebrochen. ${nameOf(active.id)} bleibt.`,
  };

  // Nach dem Loslassen feuert der Browser noch einen Klick auf die Zeile – der soll
  // nicht die Bearbeitung öffnen.
  const justDragged = useRef(false);
  function endDrag() {
    setTimeout(() => {
      justDragged.current = false;
    }, 0);
  }

  function handleDragStart() {
    justDragged.current = true;
    // Kurzes Vibrieren als Rückmeldung, dass die Zeile «angehoben» ist (wo unterstützt)
    navigator.vibrate?.(10);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    endDrag();
    const next = reorderIds(order, String(active.id), over ? String(over.id) : undefined);
    if (next === order) return;
    setPending({ base: baseKey, order: next });
    onReorder(next);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={endDrag}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'Zum Verschieben Leertaste drücken, mit den Pfeiltasten nach oben oder unten bewegen und mit Leertaste ablegen. Escape bricht ab.',
        },
      }}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className={categoryListClass}>
          {order.map((id) => {
            const category = byId.get(id);
            return category ? (
              <SortableRow
                key={id}
                category={category}
                onEdit={() => {
                  if (!justDragged.current) onEdit(category);
                }}
              />
            ) : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
