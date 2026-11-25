export type Role = 'desk' | 'reporter';
export type MemberStatus = 'active' | 'suspended';
export type ArticleStatus = 'draft' | 'pending' | 'rejected' | 'published' | 'unpublished';

export type Article = {
  id: number;
  title: string;
  subtitle: string;
  body: string;
  category: string;
  cover_url: string | null;
  cover_caption: string;
  video_url: string | null;
  author_id: string;
  author_name: string;
  status: ArticleStatus;
  reject_reason: string | null;
  is_headline: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ArticleSummary = Pick<
  Article,
  'id' | 'title' | 'subtitle' | 'category' | 'cover_url' | 'author_name' | 'published_at' | 'video_url'
>;

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: MemberStatus;
  invited_by: string | null;
  created_at: string;
};

export type FormState = { error?: string; ok?: string } | null;
