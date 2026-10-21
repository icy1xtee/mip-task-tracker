import { RowMenu } from '@/components/ui/Menu';
import { TaskCheck } from '@/components/ui/TaskCheck';
import { cx } from '@/components/ui/cx';
import { Icon } from '@/components/ui/Icon';
import { formatMoney } from '@/lib/format/money';
import type { IsoDate } from '@/lib/format/dates';
import type { Task } from '@/types/models';
import { describeDue } from './taskView';

type TaskRowProps = {
  task: Task;
  today: IsoDate;
  onToggle: (task: Task, done: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete?: (task: Task) => void;
};

export function TaskRow({ task, today, onToggle, onEdit, onDelete }: TaskRowProps) {
  const due = describeDue(task, today);
  return (
    <div className={cx('row', task.isCompleted && 'is-done')}>
      <TaskCheck
        checked={task.isCompleted}
        onChange={(done) => onToggle(task, done)}
        label={(task.isCompleted ? 'Вернуть в список: ' : 'Отметить выполненным: ') + task.title}
      />
      <div className="row-main">
        <button type="button" className="row-title" onClick={() => onEdit(task)}>
          {task.title}
        </button>
        <div
          className={cx(
            'row-meta',
            due.tone === 'overdue' && 'is-overdue',
            due.tone === 'soon' && 'is-soon',
          )}
        >
          {due.tone === 'overdue' && <Icon name="clock" />}
          <span>{due.text}</span>
        </div>
      </div>
      <div className="row-cost" style={onDelete ? undefined : { paddingRight: 8 }}>
        <span className="money">
          {task.estimatedCostMinor ? formatMoney(task.estimatedCostMinor) : '—'}
        </span>
      </div>
      {onDelete && (
        <RowMenu
          label={`Действия: ${task.title}`}
          items={[
            { label: 'Изменить', icon: 'pencil', onSelect: () => onEdit(task) },
            { label: 'Удалить', icon: 'trash', danger: true, onSelect: () => onDelete(task) },
          ]}
        />
      )}
    </div>
  );
}
