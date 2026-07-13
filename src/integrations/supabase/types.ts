export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      favorite_restaurants: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_restaurants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      food_orders: {
        Row: {
          created_at: string
          delivery_charge: number
          id: string
          items: Json
          note: string | null
          order_code: string
          receiver_block_room: string | null
          receiver_hall: string
          receiver_landmark: string | null
          receiver_name: string
          receiver_phone: string
          restaurant_id: string
          rider_id: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["food_order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_charge: number
          id?: string
          items: Json
          note?: string | null
          order_code?: string
          receiver_block_room?: string | null
          receiver_hall: string
          receiver_landmark?: string | null
          receiver_name: string
          receiver_phone: string
          restaurant_id: string
          rider_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["food_order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_charge?: number
          id?: string
          items?: Json
          note?: string | null
          order_code?: string
          receiver_block_room?: string | null
          receiver_hall?: string
          receiver_landmark?: string | null
          receiver_name?: string
          receiver_phone?: string
          restaurant_id?: string
          rider_id?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["food_order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          type: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          type?: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          order_id: string
          order_type: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          order_id: string
          order_type: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          order_id?: string
          order_type?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      parcels: {
        Row: {
          created_at: string
          delivery_charge: number
          description: string | null
          id: string
          item_type: Database["public"]["Enums"]["parcel_item_type"]
          note: string | null
          order_code: string
          photo_url: string | null
          receiver_block_room: string | null
          receiver_hall: string
          receiver_landmark: string | null
          receiver_name: string
          receiver_phone: string
          rider_id: string | null
          scheduled_for: string | null
          sender_block_room: string | null
          sender_hall: string
          sender_landmark: string | null
          sender_name: string
          sender_phone: string
          size: Database["public"]["Enums"]["parcel_size"]
          status: Database["public"]["Enums"]["parcel_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_charge: number
          description?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["parcel_item_type"]
          note?: string | null
          order_code?: string
          photo_url?: string | null
          receiver_block_room?: string | null
          receiver_hall: string
          receiver_landmark?: string | null
          receiver_name: string
          receiver_phone: string
          rider_id?: string | null
          scheduled_for?: string | null
          sender_block_room?: string | null
          sender_hall: string
          sender_landmark?: string | null
          sender_name: string
          sender_phone: string
          size: Database["public"]["Enums"]["parcel_size"]
          status?: Database["public"]["Enums"]["parcel_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_charge?: number
          description?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["parcel_item_type"]
          note?: string | null
          order_code?: string
          photo_url?: string | null
          receiver_block_room?: string | null
          receiver_hall?: string
          receiver_landmark?: string | null
          receiver_name?: string
          receiver_phone?: string
          rider_id?: string | null
          scheduled_for?: string | null
          sender_block_room?: string | null
          sender_hall?: string
          sender_landmark?: string | null
          sender_name?: string
          sender_phone?: string
          size?: Database["public"]["Enums"]["parcel_size"]
          status?: Database["public"]["Enums"]["parcel_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          account_number: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          method: string
          note: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          txn_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          method: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          txn_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          method?: string
          note?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          txn_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_requests_txn_id_fkey"
            columns: ["txn_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          block_room: string | null
          created_at: string
          full_name: string | null
          hall: string | null
          id: string
          phone: string | null
          profile_complete: boolean
          referral_code: string
          referred_by: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          block_room?: string | null
          created_at?: string
          full_name?: string | null
          hall?: string | null
          id: string
          phone?: string | null
          profile_complete?: boolean
          referral_code: string
          referred_by?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          block_room?: string | null
          created_at?: string
          full_name?: string | null
          hall?: string | null
          id?: string
          phone?: string | null
          profile_complete?: boolean
          referral_code?: string
          referred_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          per_user_limit: number
          usage_limit: number | null
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number
          usage_limit?: number | null
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          per_user_limit?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          created_at: string
          discount: number
          id: string
          order_id: string
          order_type: string
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discount: number
          id?: string
          order_id: string
          order_type: string
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          order_id?: string
          order_type?: string
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          close_time: string | null
          created_at: string
          cuisine: string | null
          delivery_time_min: number
          description: string | null
          id: string
          image_url: string | null
          is_open: boolean
          min_order: number
          name: string
          open_time: string | null
          owner_id: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          cuisine?: string | null
          delivery_time_min?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          min_order?: number
          name: string
          open_time?: string | null
          owner_id?: string | null
          rating?: number
          updated_at?: string
        }
        Update: {
          close_time?: string | null
          created_at?: string
          cuisine?: string | null
          delivery_time_min?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          min_order?: number
          name?: string
          open_time?: string | null
          owner_id?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          order_id: string
          order_type: string
          owner_reply: string | null
          owner_reply_at: string | null
          photo_urls: string[]
          rating: number
          restaurant_id: string | null
          rider_id: string | null
          rider_rating: number | null
          rider_reply: string | null
          rider_reply_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          order_type: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          photo_urls?: string[]
          rating: number
          restaurant_id?: string | null
          rider_id?: string | null
          rider_rating?: number | null
          rider_reply?: string | null
          rider_reply_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          order_type?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          photo_urls?: string[]
          rating?: number
          restaurant_id?: string | null
          rider_id?: string | null
          rider_rating?: number | null
          rider_reply?: string | null
          rider_reply_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      rider_applications: {
        Row: {
          admin_note: string | null
          availability: string | null
          created_at: string
          department: string | null
          full_name: string
          hall: string | null
          has_bike: boolean
          id: string
          motivation: string | null
          phone: string
          semester: string | null
          status: string
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          availability?: string | null
          created_at?: string
          department?: string | null
          full_name: string
          hall?: string | null
          has_bike?: boolean
          id?: string
          motivation?: string | null
          phone: string
          semester?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          availability?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          hall?: string | null
          has_bike?: boolean
          id?: string
          motivation?: string | null
          phone?: string
          semester?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          kind: string
          method: string | null
          note: string | null
          order_id: string | null
          order_type: string | null
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          kind: string
          method?: string | null
          note?: string | null
          order_id?: string | null
          order_type?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          kind?: string
          method?: string | null
          note?: string | null
          order_id?: string | null
          order_type?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_payout: {
        Args: { _admin_note: string; _req_id: string }
        Returns: undefined
      }
      approve_topup: { Args: { _txn_id: string }; Returns: undefined }
      assign_restaurant_owner: {
        Args: { _restaurant_id: string; _user_id: string }
        Returns: undefined
      }
      attach_referrer: { Args: { _code: string }; Returns: string }
      gen_referral_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_order_party: {
        Args: { _order_id: string; _order_type: string; _user: string }
        Returns: boolean
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      my_credit_balance: { Args: never; Returns: number }
      my_restaurant_id: { Args: never; Returns: string }
      my_unread_notification_count: { Args: never; Returns: number }
      my_wallet_balance: { Args: never; Returns: number }
      pay_with_wallet: {
        Args: { _amount: number; _order_id: string; _order_type: string }
        Returns: number
      }
      redeem_credits: {
        Args: { _amount: number; _order_id: string; _order_type: string }
        Returns: number
      }
      redeem_promo: {
        Args: {
          _code: string
          _order_id: string
          _order_type: string
          _subtotal: number
        }
        Returns: number
      }
      reject_payout: {
        Args: { _admin_note: string; _req_id: string }
        Returns: undefined
      }
      reject_topup: {
        Args: { _note: string; _txn_id: string }
        Returns: undefined
      }
      request_payout: {
        Args: { _account_number: string; _amount: number; _method: string }
        Returns: string
      }
      request_topup: {
        Args: { _amount: number; _method: string; _reference: string }
        Returns: string
      }
      restaurant_ratings: {
        Args: never
        Returns: {
          avg_rating: number
          restaurant_id: string
          review_count: number
        }[]
      }
      rider_ratings: {
        Args: never
        Returns: {
          avg_rating: number
          review_count: number
          rider_id: string
        }[]
      }
      track_order: {
        Args: { _code: string }
        Returns: {
          created_at: string
          order_code: string
          order_type: string
          receiver_hall: string
          status: string
          updated_at: string
        }[]
      }
      validate_promo: {
        Args: { _code: string; _order_type: string; _subtotal: number }
        Returns: {
          code: string
          discount: number
          message: string
          promo_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "user" | "restaurant"
      food_order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "picked_up"
        | "delivered"
        | "cancelled"
      parcel_item_type:
        | "document"
        | "medicine"
        | "grocery"
        | "clothes"
        | "electronics"
        | "other"
      parcel_size: "small" | "medium" | "large"
      parcel_status:
        | "pending"
        | "rider_assigned"
        | "picked_up"
        | "delivered"
        | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "rider", "user", "restaurant"],
      food_order_status: [
        "pending",
        "confirmed",
        "preparing",
        "picked_up",
        "delivered",
        "cancelled",
      ],
      parcel_item_type: [
        "document",
        "medicine",
        "grocery",
        "clothes",
        "electronics",
        "other",
      ],
      parcel_size: ["small", "medium", "large"],
      parcel_status: [
        "pending",
        "rider_assigned",
        "picked_up",
        "delivered",
        "cancelled",
      ],
    },
  },
} as const
