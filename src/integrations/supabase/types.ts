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
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          clock_in_at: string
          clock_out_at: string | null
          created_at: string
          employee_id: string
          id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          employee_id: string
          id?: string
          updated_at?: string
          work_date?: string
        }
        Update: {
          clock_in_at?: string
          clock_out_at?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string
          department: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          availability: Json
          created_at: string
          employee_code: string | null
          full_name: string
          id: string
          invite_expires_at: string | null
          invited_at: string | null
          max_hours_per_week: number | null
          notes: string | null
          phone: string | null
          primary_position_id: string | null
          secondary_position_ids: string[]
          status: Database["public"]["Enums"]["staff_status"]
          updated_at: string
        }
        Insert: {
          availability?: Json
          created_at?: string
          employee_code?: string | null
          full_name: string
          id: string
          invite_expires_at?: string | null
          invited_at?: string | null
          max_hours_per_week?: number | null
          notes?: string | null
          phone?: string | null
          primary_position_id?: string | null
          secondary_position_ids?: string[]
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
        }
        Update: {
          availability?: Json
          created_at?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          invite_expires_at?: string | null
          invited_at?: string | null
          max_hours_per_week?: number | null
          notes?: string | null
          phone?: string | null
          primary_position_id?: string | null
          secondary_position_ids?: string[]
          status?: Database["public"]["Enums"]["staff_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_primary_position_id_fkey"
            columns: ["primary_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_weeks: {
        Row: {
          created_at: string
          published_at: string | null
          published_by: string | null
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          published_at?: string | null
          published_by?: string | null
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
          week_start?: string
        }
        Relationships: []
      }
      shift_swap_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          from_employee_id: string
          id: string
          proposed_by: string
          reason: string | null
          shift_id: string
          status: Database["public"]["Enums"]["swap_status"]
          to_employee_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          from_employee_id: string
          id?: string
          proposed_by: string
          reason?: string | null
          shift_id: string
          status?: Database["public"]["Enums"]["swap_status"]
          to_employee_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          from_employee_id?: string
          id?: string
          proposed_by?: string
          reason?: string | null
          shift_id?: string
          status?: Database["public"]["Enums"]["swap_status"]
          to_employee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_swap_requests_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number
          created_at: string
          created_by: string | null
          employee_id: string
          end_time: string
          id: string
          notes: string | null
          position_id: string | null
          start_time: string
          updated_at: string
          work_date: string
        }
        Insert: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          employee_id: string
          end_time: string
          id?: string
          notes?: string | null
          position_id?: string | null
          start_time: string
          updated_at?: string
          work_date: string
        }
        Update: {
          break_minutes?: number
          created_at?: string
          created_by?: string | null
          employee_id?: string
          end_time?: string
          id?: string
          notes?: string | null
          position_id?: string | null
          start_time?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      any_manager_exists: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "manager" | "shift_lead" | "staff"
      schedule_status: "draft" | "published"
      staff_status: "active" | "inactive"
      swap_status: "pending" | "approved" | "rejected" | "cancelled"
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
      app_role: ["manager", "shift_lead", "staff"],
      schedule_status: ["draft", "published"],
      staff_status: ["active", "inactive"],
      swap_status: ["pending", "approved", "rejected", "cancelled"],
    },
  },
} as const
