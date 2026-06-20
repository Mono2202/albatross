import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TabName } from '@/types';
import { useLocalConfig } from '@/context/LocalConfigContext';

const TAB_META: Record<TabName, { label: string; icon: string }> = {
  today:    { label: 'Today',    icon: '/assets/today.svg' },
  planning: { label: 'Planning', icon: '/assets/planning.svg' },
  inbox:    { label: 'Inbox',    icon: '/assets/inbox.svg' },
  habits:   { label: 'Habits',   icon: '/assets/habits.svg' },
  finance:  { label: 'Finance',  icon: '/assets/finance.svg' },
  workout:  { label: 'Workout',  icon: '/assets/workout.svg' },
  music:    { label: 'Music',    icon: '/assets/music.svg' },
  food:     { label: 'Food',     icon: '/assets/food.svg' },
};

function SortableTabRow({ id, hidden, onToggle }: { id: TabName; hidden: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const { label, icon } = TAB_META[id];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="settings-tab-row"
    >
      <span className="settings-drag-handle" {...attributes} {...listeners}>⠿</span>
      <img src={icon} alt={label} className="settings-tab-icon" />
      <span className="settings-tab-label">{label}</span>
      <label className="settings-switch">
        <input type="checkbox" checked={!hidden} onChange={onToggle} />
        <span className="settings-switch-track" />
      </label>
    </div>
  );
}

export function TabsSection() {
  const { tabOrder, setTabOrder, hiddenTabs, toggleHiddenTab } = useLocalConfig();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tabOrder.indexOf(active.id as TabName);
      const newIndex = tabOrder.indexOf(over.id as TabName);
      setTabOrder(arrayMove(tabOrder, oldIndex, newIndex));
    }
  }

  return (
    <div className="settings-section">
      <p className="settings-hint">Drag to reorder. Toggle to show or hide a tab in the nav bar.</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tabOrder} strategy={verticalListSortingStrategy}>
          {tabOrder.map(id => (
            <SortableTabRow
              key={id}
              id={id}
              hidden={hiddenTabs.includes(id)}
              onToggle={() => toggleHiddenTab(id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
