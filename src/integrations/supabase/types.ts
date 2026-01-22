export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ad_accounts: {
        Row: {
          access_token: string | null
          account_id: string | null
          created_at: string
          id: string
          name: string | null
          user_id: string | null
          status: string | null
          business_id: string | null
          currency: string | null
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          user_id?: string | null
          status?: string | null
          business_id?: string | null
          currency?: string | null
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          created_at?: string
          id?: string
          name?: string | null
          user_id?: string | null
          status?: string | null
          business_id?: string | null
          currency?: string | null
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          id: string
          name: string
          owner_id: string
          plan_type: string
          max_fb_profiles: number
          max_members: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          plan_type?: string
          max_fb_profiles?: number
          max_members?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          plan_type?: string
          max_fb_profiles?: number
          max_members?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_folder_items: {
        Row: {
          asset_id: string
          asset_type: string
          created_at: string
          folder_id: string
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          asset_type: string
          created_at?: string
          folder_id: string
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          asset_type?: string
          created_at?: string
          folder_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "asset_folders"
            referencedColumns: ["id"]
          }
        ]
      }
      asset_folders: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fb_connections: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: string
          instagram_actor_id: string | null
          name: string | null
          page_id: string | null
          status: string | null
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          instagram_actor_id?: string | null
          name?: string | null
          page_id?: string | null
          status?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          instagram_actor_id?: string | null
          name?: string | null
          page_id?: string | null
          status?: string | null
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      shared_dashboards: {
        Row: {
          ad_account_id: string
          agency_logo: string | null
          agency_name: string | null
          created_at: string
          id: string
          is_active: boolean
          share_token: string
          user_id: string
        }
        Insert: {
          ad_account_id: string
          agency_logo?: string | null
          agency_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          share_token?: string
          user_id: string
        }
        Update: {
          ad_account_id?: string
          agency_logo?: string | null
          agency_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          share_token?: string
          user_id?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_workspace_for_user: {
        Args: {
          p_name: string
          p_owner_id: string
          p_plan_type: string
          p_max_fb_profiles: number
          p_max_members: number
        }
        Returns: {
          id: string
          name: string
          owner_id: string
          plan_type: string
          max_fb_profiles: number
          max_members: number
          created_at: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
