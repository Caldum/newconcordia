export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_list_countries: {
        Args: Record<PropertyKey, never>;
        Returns: {
          apply_on: string;
          citizens: number;
          code: string;
          is_active: boolean;
          name_en: string;
          name_es: string;
          regions: number;
          scheduled: boolean;
          waiting: number;
        }[];
      };
      admin_list_log: {
        Args: { p_limit?: number };
        Returns: {
          action: string;
          actor_name: string;
          after: Json;
          before: Json;
          created_at: string;
          id: number;
          target: string;
        }[];
      };
      admin_list_regions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          apply_on: string;
          code: string;
          home_country_code: string;
          is_enabled: boolean;
          name: string;
          owner_country_code: string;
          scheduled: boolean;
        }[];
      };
      admin_list_team: {
        Args: Record<PropertyKey, never>;
        Returns: {
          added_at: string;
          email: string;
          name: string;
        }[];
      };
      admin_schedule_country: {
        Args: { p_active: boolean; p_country_code: string };
        Returns: number;
      };
      admin_schedule_region: {
        Args: { p_enabled: boolean; p_region_code: string };
        Returns: number;
      };
      am_i_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      cancel_citizenship_request: { Args: Record<PropertyKey, never>; Returns: undefined };
      check_citizen_name: { Args: { p_name: string; p_signup_key?: string }; Returns: string };
      count_waitlist: { Args: { p_country_code: string }; Returns: number };
      create_my_citizen: {
        Args: { p_country_code: string; p_locale: string; p_name: string };
        Returns: {
          country_code: string;
          locale: string;
          name: string;
        }[];
      };
      decide_citizenship_request: {
        Args: { p_approve: boolean; p_request_id: number };
        Returns: undefined;
      };
      get_citizenship_rules: {
        Args: { p_country_code: string };
        Returns: {
          answer_hours: number;
          country_code: string;
          election_wait_days: number;
          mode: string;
        }[];
      };
      get_game_clock: {
        Args: Record<PropertyKey, never>;
        Returns: {
          game_day: string;
          next_day_starts_at: string;
          server_time: string;
        }[];
      };
      get_my_balances: {
        Args: Record<PropertyKey, never>;
        Returns: {
          balance: number;
          country_code: string;
          currency_code: string;
        }[];
      };
      get_my_citizen: {
        Args: Record<PropertyKey, never>;
        Returns: {
          adaptation_ends_at: string;
          citizen_code: string;
          citizen_since: string;
          country_code: string;
          joined_at: string;
          locale: string;
          name: string;
          next_change_from: string;
          region_code: string;
          reviews_citizenship: boolean;
          votes_in_elections_from: string;
        }[];
      };
      get_my_citizenship_request: {
        Args: Record<PropertyKey, never>;
        Returns: {
          answer_by: string;
          created_at: string;
          decided_at: string;
          request_id: number;
          status: string;
          to_country_code: string;
        }[];
      };
      get_my_profile: {
        Args: Record<PropertyKey, never>;
        Returns: {
          checked_at: string;
          citizen_code: string;
          country_code: string;
          damage: number;
          energy: number;
          energy_max: number;
          energy_per_hour: number;
          experience: number;
          influence: number;
          joined_at: string;
          level: number;
          level_experience: number;
          name: string;
          next_energy_at: string;
          next_level_experience: number;
          next_rank_damage: number;
          rank: number;
          region_code: string;
          strength: number;
        }[];
      };
      get_my_waitlist: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_code: string;
          joined_at: string;
          place: number;
        }[];
      };
      join_waitlist: { Args: { p_country_code: string }; Returns: undefined };
      leave_waitlist: { Args: Record<PropertyKey, never>; Returns: undefined };
      list_citizenship_requests: {
        Args: Record<PropertyKey, never>;
        Returns: {
          account_age_days: number;
          answer_by: string;
          citizen_name: string;
          created_at: string;
          from_country_code: string;
          request_id: number;
        }[];
      };
      list_countries: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          color: string;
          is_active: boolean;
          iso2: string;
          name_en: string;
          name_es: string;
          official_name_en: string;
          official_name_es: string;
        }[];
      };
      list_my_movements: {
        Args: { p_before?: number; p_currency?: string; p_limit?: number };
        Returns: {
          amount: number;
          balance_after: number;
          counterparty_country_code: string;
          counterparty_kind: string;
          counterparty_name: string;
          created_at: string;
          currency_code: string;
          kind: string;
          memo: string;
          posting_id: number;
        }[];
      };
      list_regions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          home_country_code: string;
          is_enabled: boolean;
          name: string;
          owner_country_code: string;
        }[];
      };
      request_citizenship: {
        Args: { p_country_code: string };
        Returns: {
          request_id: number;
          status: string;
        }[];
      };
      run_job: { Args: { p_at?: string; p_job: string }; Returns: Json };
      transfer_money: {
        Args: {
          p_amount: number;
          p_currency: string;
          p_key: string;
          p_memo: string;
          p_to_name: string;
        };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
