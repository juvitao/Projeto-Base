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
      vora_clients: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string
          address: string | null
          gender: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone: string
          address?: string | null
          gender?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string
          address?: string | null
          gender?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vora_products: {
        Row: {
          id: string
          sku: string | null
          name: string
          description: string | null
          stock_quantity: number
          unit_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sku?: string | null
          name: string
          description?: string | null
          stock_quantity?: number
          unit_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sku?: string | null
          name?: string
          description?: string | null
          stock_quantity?: number
          unit_price?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vora_brands: {
        Row: {
          id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          color?: string
          created_at?: string
        }
        Relationships: []
      }
      vora_catalog_products: {
        Row: {
          id: string
          brand_id: string
          name: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          category?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          category?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_catalog_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vora_brands"
            referencedColumns: ["id"]
          }
        ]
      }
      vora_inventory: {
        Row: {
          id: string
          user_id: string
          catalog_product_id: string
          quantity: number
          cost_price: number
          sale_price: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          catalog_product_id: string
          quantity?: number
          cost_price?: number
          sale_price?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          catalog_product_id?: string
          quantity?: number
          cost_price?: number
          sale_price?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_inventory_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "vora_catalog_products"
            referencedColumns: ["id"]
          }
        ]
      }
      vora_sales: {
        Row: {
          id: string
          display_id: number
          user_id: string | null
          client_id: string | null
          sale_date: string
          payment_method: string
          total_amount: number
          installments: number
          first_installment_date: string | null
          discount: number
          paid: boolean
          created_at: string
        }
        Insert: {
          id?: string
          display_id?: number
          user_id?: string | null
          client_id?: string | null
          sale_date?: string
          payment_method?: string
          total_amount?: number
          installments?: number
          first_installment_date?: string | null
          discount?: number
          paid?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          display_id?: number
          user_id?: string | null
          client_id?: string | null
          sale_date?: string
          payment_method?: string
          total_amount?: number
          installments?: number
          first_installment_date?: string | null
          discount?: number
          paid?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vora_clients"
            referencedColumns: ["id"]
          }
        ]
      }
      vora_sale_items: {
        Row: {
          id: string
          sale_id: string | null
          product_id: string | null
          name: string
          quantity: number
          unit_price: number
          needs_ordering: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sale_id?: string | null
          product_id?: string | null
          name: string
          quantity: number
          unit_price: number
          needs_ordering?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sale_id?: string | null
          product_id?: string | null
          name?: string
          quantity?: number
          unit_price?: number
          needs_ordering?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "vora_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vora_sales"
            referencedColumns: ["id"]
          }
        ]
      }
      vora_payments: {
        Row: {
          id: string
          client_id: string | null
          sale_id: string | null
          payment_date: string
          amount: number
          method: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          sale_id?: string | null
          payment_date?: string
          amount: number
          method?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          sale_id?: string | null
          payment_date?: string
          amount?: number
          method?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vora_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "vora_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vora_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "vora_sales"
            referencedColumns: ["id"]
          }
        ]
      }
      vora_financial_entries: {
        Row: {
          id: string
          user_id: string
          type: string
          category: string
          description: string | null
          amount: number
          payment_method: string | null
          card_fee_percent: number
          net_amount: number | null
          entry_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          category: string
          description?: string | null
          amount: number
          payment_method?: string | null
          card_fee_percent?: number
          net_amount?: number | null
          entry_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          category?: string
          description?: string | null
          amount?: number
          payment_method?: string | null
          card_fee_percent?: number
          net_amount?: number | null
          entry_date?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      vora_receivables: {
        Row: {
          id: string
          user_id: string
          client_name: string
          products: string | null
          amount_due: number
          amount_paid: number
          due_date: string
          status: string
          notes: string | null
          sale_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          client_name: string
          products?: string | null
          sale_id?: string | null
          amount_due: number
          amount_paid?: number
          due_date: string
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          client_name?: string
          products?: string | null
          amount_due?: number
          amount_paid?: number
          due_date?: string
          status?: string
          notes?: string | null
          sale_id?: string | null
          created_at?: string
          updated_at?: string
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
      create_sale_with_receivables: {
        Args: {
          p_user_id: string
          p_client_id: string
          p_sale_date: string
          p_payment_method: string
          p_discount: number
          p_total_amount: number
          p_installments: number
          p_first_installment_date: string
          p_items: any
          p_receivables: any
        }
        Returns: string
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
