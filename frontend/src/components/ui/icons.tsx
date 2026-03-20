/**
 * Ícones Lucide com traço fino (stroke 1.5) para vibe dark/medieval.
 * Reexporta com default strokeWidth para uso consistente no app.
 */
import React from 'react'
import {
  LayoutDashboard,
  Map,
  Code,
  CheckSquare,
  Settings,
  Trophy,
  HelpCircle,
  LogOut,
  ChevronLeft,
  Menu,
  BarChart2,
  Paintbrush,
  Flag,
  User,
  Users,
  Shield,
  Key,
  Plus,
  Pencil,
  Trash2,
  Bell,
  Check,
  CheckCheck,
  GripVertical,
  Send,
  Image,
  UserPlus,
  MessageCircle,
  ExternalLink,
  Calendar,
  Lock,
  Archive,
  Tag,
  ChevronDown,
  ChevronUp,
  FileText,
  List,
  Folder,
  ClipboardList,
  Star,
  Medal,
  Sparkles,
  FileCheck,
  ListChecks,
  Clock,
  TrendingUp,
  CircleDollarSign,
  Network,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'

const thin = { strokeWidth: 1.5 }

function withThin(Icon: React.ComponentType<LucideProps>) {
  const Wrapped = (props: LucideProps) => <Icon {...thin} {...props} />
  Wrapped.displayName = `WithThin(${Icon.displayName ?? 'Icon'})`
  return Wrapped
}

export const Dashboard = withThin(LayoutDashboard)
export const MapIcon = Map
export { Code, CheckSquare, Settings, Trophy, HelpCircle, LogOut, ChevronLeft, Menu, BarChart2, Paintbrush, Flag }
export const Person = withThin(User)
export const People = withThin(Users)
export const Security = withThin(Shield)
export { Key, Plus, Pencil, Trash2, Bell, Check, CheckCheck, GripVertical, Send, Image, UserPlus }
export const CheckCircle = withThin(FileCheck)
export const CheckCircleIcon = CheckCircle
export const MessageCircleIcon = withThin(MessageCircle)
export { ExternalLink, Calendar, Lock, Archive, Tag, ChevronDown, ChevronUp, FileText, List, Folder, ClipboardList }
export { Star, Medal, Sparkles }
export const ClockIcon = withThin(Clock)
export { Clock, TrendingUp }
export const DollarSign = withThin(CircleDollarSign)
export const OrgChartIcon = withThin(Network)

// Alias para compatibilidade com nomes do backend (achievements)
export const EmojiEvents = Trophy
export const TaskAlt = withThin(ListChecks)
export const Stars = Star
export const MilitaryTech = Medal
export const AutoAwesome = Sparkles
