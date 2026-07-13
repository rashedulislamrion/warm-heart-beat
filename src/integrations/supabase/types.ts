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
          updated_at?: string
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          created_at: string
          cuisine: string | null
          delivery_time_min: number
          description: string | null
          id: string
          image_url: string | null
          is_open: boolean
          min_order: number
          name: string
          rating: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cuisine?: string | null
          delivery_time_min?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          min_order?: number
          name: string
          rating?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cuisine?: string | null
          delivery_time_min?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          min_order?: number
          name?: string
          rating?: number
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "rider" | "user"
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
      app_role: ["admin", "rider", "user"],
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
