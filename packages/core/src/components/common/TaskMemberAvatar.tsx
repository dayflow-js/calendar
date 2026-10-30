import type { TaskMember } from '@/types';
import { getMemberInitials } from '@/utils/taskUtils';

const AVATAR_COLORS = [
  '#6366f1',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
];

/** A stable color per member, so initials stay recognizable. */
const getAvatarColor = (member: TaskMember) => {
  if (member.color) return member.color;
  let hash = 0;
  for (const char of member.id)
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 2_147_483_647;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

interface TaskMemberAvatarProps {
  member: TaskMember;
  size?: number;
  /** Shows the name as a tooltip. Decorative avatars beside a name omit it. */
  title?: boolean;
}

export const TaskMemberAvatar = ({
  member,
  size = 20,
  title = false,
}: TaskMemberAvatarProps) => (
  <span
    className='df-task-avatar'
    style={{
      width: size,
      height: size,
      fontSize: Math.max(9, Math.round(size * 0.42)),
      backgroundColor: getAvatarColor(member),
    }}
    title={title ? member.name : undefined}
    aria-hidden='true'
  >
    {member.avatarUrl ? (
      // oxlint-disable-next-line nextjs/no-img-element -- framework-neutral library markup
      <img src={member.avatarUrl} alt='' draggable={false} />
    ) : (
      getMemberInitials(member)
    )}
  </span>
);

interface TaskAvatarStackProps {
  members: readonly TaskMember[];
  size?: number;
  max?: number;
}

/** Overlapping avatars, collapsing extras into a "+n" chip. */
export const TaskAvatarStack = ({
  members,
  size = 20,
  max = 3,
}: TaskAvatarStackProps) => {
  if (members.length === 0) return null;
  const shown = members.slice(0, max);
  const hidden = members.length - shown.length;
  return (
    <span
      className='df-task-avatar-stack'
      role='img'
      aria-label={members.map(member => member.name).join(', ')}
    >
      {shown.map(member => (
        <TaskMemberAvatar key={member.id} member={member} size={size} title />
      ))}
      {hidden > 0 && (
        <span
          className='df-task-avatar df-task-avatar-more'
          style={{
            width: size,
            height: size,
            fontSize: Math.round(size * 0.42),
          }}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
};
