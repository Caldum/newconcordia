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
      appoint_governor: { Args: { p_name: string }; Returns: undefined };
      appoint_minister: { Args: { p_ministry: string; p_name: string }; Returns: undefined };
      authorize_second_shift: {
        Args: { p_company_id: number; p_employee_name: string; p_wage?: number };
        Returns: undefined;
      };
      break_motion_tie: { Args: { p_choice: string; p_motion_id: number }; Returns: undefined };
      break_tie: { Args: { p_bill_id: number; p_choice: string }; Returns: undefined };
      buy: {
        Args: { p_company_id?: number; p_key: string; p_offer_id: number; p_quantity: number };
        Returns: number;
      };
      buy_market_license: {
        Args: { p_key: string; p_market_country_code: string };
        Returns: number;
      };
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
      dismiss_official: { Args: { p_office: string }; Returns: undefined };
      donate_to_party: {
        Args: { p_amount: number; p_currency: string; p_key: string; p_party_id: number };
        Returns: undefined;
      };
      found_company: {
        Args: { p_good_code: string; p_key: string; p_name: string; p_region_code: string };
        Returns: number;
      };
      found_party: {
        Args: { p_description: string; p_key: string; p_name: string };
        Returns: number;
      };
      fund_company: {
        Args: { p_amount: number; p_company_id: number; p_key: string };
        Returns: number;
      };
      get_cabinet: {
        Args: { p_country_code: string };
        Returns: {
          name: string;
          office: string;
          party_name: string;
          since: string;
        }[];
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
      get_company_employees: {
        Args: { p_company_id: number };
        Returns: {
          hired_at: string;
          name: string;
          second_shift_wage: number;
          streak: number;
          worked_today: boolean;
        }[];
      };
      get_company_stock: {
        Args: { p_company_id: number };
        Returns: {
          good_code: string;
          quantity: number;
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
      get_government: {
        Args: { p_country_code: string };
        Returns: {
          name: string;
          office: string;
          party_name: string;
          since: string;
        }[];
      };
      get_last_national_election: {
        Args: { p_country_code: string; p_kind: string };
        Returns: {
          ballots: number;
          election_id: number;
          proclaimed_at: string;
          seats: number;
        }[];
      };
      get_last_party_election: {
        Args: { p_party_id: number };
        Returns: {
          ballots: number;
          election_id: number;
          proclaimed_at: string;
        }[];
      };
      get_market_license_terms: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_share: number;
          price: number;
          required: boolean;
        }[];
      };
      get_ministry_stock: {
        Args: { p_ministry: string };
        Returns: {
          good_code: string;
          origin_country_code: string;
          quantity: number;
        }[];
      };
      get_my_balances: {
        Args: Record<PropertyKey, never>;
        Returns: {
          balance: number;
          country_code: string;
          currency_code: string;
          held: number;
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
      get_my_initiative: {
        Args: Record<PropertyKey, never>;
        Returns: {
          allowed: number;
          office: string;
          used: number;
        }[];
      };
      get_my_inventory: {
        Args: Record<PropertyKey, never>;
        Returns: {
          good_code: string;
          quantity: number;
        }[];
      };
      get_my_job: {
        Args: Record<PropertyKey, never>;
        Returns: {
          company_id: number;
          company_name: string;
          good_code: string;
          hired_at: string;
          next_change_at: string;
          owner_name: string;
          region_code: string;
          second_shift_wage: number;
          streak: number;
          wage: number;
          work_tax: number;
          worked_today: boolean;
        }[];
      };
      get_my_office: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_code: string;
          office: string;
        }[];
      };
      get_my_party: {
        Args: Record<PropertyKey, never>;
        Returns: {
          is_leader: boolean;
          joined_at: string;
          party_id: number;
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
          health: number;
          health_max: number;
          influence: number;
          joined_at: string;
          level: number;
          level_experience: number;
          military_xp: number;
          name: string;
          next_energy_at: string;
          next_level_experience: number;
          next_rank_xp: number;
          rank_step: number;
          rank_xp: number;
          region_code: string;
          strength: number;
        }[];
      };
      get_my_shifts_today: {
        Args: Record<PropertyKey, never>;
        Returns: {
          company_id: number;
          company_name: string;
          good_code: string;
          gross: number;
          kind: string;
          net: number;
          produced: number;
          tax: number;
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
      get_national_election: {
        Args: { p_country_code: string; p_kind: string };
        Returns: {
          ballots: number;
          candidacies: number;
          election_id: number;
          i_can_vote: boolean;
          i_voted: boolean;
          registration_closes_at: string;
          registration_opens_at: string;
          seats: number;
          status: string;
          takes_office_at: string;
          voters: number;
          voting_ends_at: string;
          voting_starts_at: string;
        }[];
      };
      get_party_election: {
        Args: { p_party_id: number };
        Returns: {
          ballots: number;
          candidates: number;
          election_id: number;
          i_am_candidate: boolean;
          i_can_vote: boolean;
          i_voted: boolean;
          registration_closes_at: string;
          status: string;
          takes_office_at: string;
          voters: number;
          voting_ends_at: string;
          voting_starts_at: string;
        }[];
      };
      get_public_finances: {
        Args: { p_country_code: string };
        Returns: {
          balance: number;
          currency_code: string;
          held: number;
          institution: string;
        }[];
      };
      issue_decree: { Args: { p_body: string; p_key: string; p_title: string }; Returns: number };
      join_party: { Args: { p_party_id: number }; Returns: undefined };
      join_waitlist: { Args: { p_country_code: string }; Returns: undefined };
      leave_job: { Args: Record<PropertyKey, never>; Returns: undefined };
      leave_party: { Args: Record<PropertyKey, never>; Returns: undefined };
      leave_waitlist: { Args: Record<PropertyKey, never>; Returns: undefined };
      list_bill_votes: {
        Args: { p_bill_id: number };
        Returns: {
          cast_at: string;
          choice: string;
          name: string;
        }[];
      };
      list_bills: {
        Args: { p_country_code: string };
        Returns: {
          abstain: number;
          bill_id: number;
          body: string;
          closes_at: string;
          failure: string;
          kind: string;
          majority: string;
          members: number;
          my_vote: string;
          no: number;
          opened_at: string;
          proposed_by_name: string;
          proposer_office: string;
          status: string;
          terms: Json;
          tiebreak: string;
          title: string;
          yes: number;
        }[];
      };
      list_candidates: {
        Args: { p_election_id: number };
        Returns: {
          candidacy_id: number;
          civil_level: number;
          elected: boolean;
          name: string;
          registered_at: string;
          votes: number;
        }[];
      };
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
      list_congress: {
        Args: { p_country_code: string };
        Returns: {
          name: string;
          party_name: string;
          since: string;
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
      list_decrees: {
        Args: { p_country_code: string };
        Returns: {
          body: string;
          decree_id: number;
          issued_at: string;
          issued_by_name: string;
          title: string;
        }[];
      };
      list_goods: {
        Args: Record<PropertyKey, never>;
        Returns: {
          base_output: number;
          category: string;
          code: string;
          energy: number;
          heal: number;
          input_good_code: string;
          input_per_unit: number;
          kind: string;
          quality: number;
        }[];
      };
      list_goods_effects: {
        Args: Record<PropertyKey, never>;
        Returns: {
          code: string;
          damage_multiplier: number;
          energy: number;
          food_energy_per_interval: number;
          heal: number;
        }[];
      };
      list_job_offers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          company_id: number;
          good_code: string;
          name: string;
          owner_name: string;
          region_code: string;
          vacancies: number;
          wage: number;
        }[];
      };
      list_market: {
        Args: { p_country_code: string; p_good_code: string };
        Returns: {
          imported: boolean;
          offer_id: number;
          origin_country_code: string;
          price: number;
          quantity: number;
          seller_name: string;
          tariff: number;
        }[];
      };
      list_motion_votes: {
        Args: { p_motion_id: number };
        Returns: {
          cast_at: string;
          choice: string;
          name: string;
        }[];
      };
      list_motions: {
        Args: { p_country_code: string };
        Returns: {
          abstain: number;
          closes_at: string;
          kind: string;
          members: number;
          motion_id: number;
          my_vote: string;
          no: number;
          opened_at: string;
          proposed_by_name: string;
          status: string;
          target_name: string;
          target_office: string;
          yes: number;
        }[];
      };
      list_my_companies: {
        Args: Record<PropertyKey, never>;
        Returns: {
          cash: number;
          category: string;
          country_code: string;
          created_at: string;
          efficiency: number;
          employees: number;
          good_code: string;
          id: number;
          kind: string;
          level: number;
          name: string;
          national_bonus: number;
          next_level_civil_level: number;
          next_level_gold: number;
          region_code: string;
          shifts_per_day: number;
          shifts_today: number;
          vacancies: number;
          wage: number;
        }[];
      };
      list_my_market_licenses: {
        Args: Record<PropertyKey, never>;
        Returns: {
          granted_at: string;
          market_country_code: string;
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
      list_my_offers: {
        Args: Record<PropertyKey, never>;
        Returns: {
          company_name: string;
          created_at: string;
          good_code: string;
          market_country_code: string;
          offer_id: number;
          price: number;
          quantity: number;
          sold: number;
          status: string;
        }[];
      };
      list_parties: {
        Args: { p_country_code: string };
        Returns: {
          credit: number;
          description: string;
          founded_at: string;
          gold: number;
          leader_name: string;
          members: number;
          name: string;
          party_id: number;
        }[];
      };
      list_party_lists: {
        Args: { p_election_id: number };
        Returns: {
          candidacy_id: number;
          candidates: string[];
          party_name: string;
          registered_at: string;
          seats: number;
          votes: number;
        }[];
      };
      list_party_members: {
        Args: { p_party_id: number };
        Returns: {
          civil_level: number;
          is_leader: boolean;
          joined_at: string;
          name: string;
        }[];
      };
      list_public_movements: {
        Args: { p_before?: number; p_country_code: string };
        Returns: {
          amount: number;
          counterparty_kind: string;
          counterparty_name: string;
          created_at: string;
          currency_code: string;
          institution: string;
          kind: string;
          memo: string;
          ordered_by: string;
          posting_id: number;
        }[];
      };
      list_region_resources: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: string;
          region_code: string;
          resource_code: string;
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
      list_resources: {
        Args: Record<PropertyKey, never>;
        Returns: {
          category: string;
          code: string;
        }[];
      };
      list_tickets: {
        Args: { p_election_id: number };
        Returns: {
          candidacy_id: number;
          elected: boolean;
          party_name: string;
          president_name: string;
          registered_at: string;
          vice_president_name: string;
          votes: number;
        }[];
      };
      market_summary: {
        Args: { p_country_code: string };
        Returns: {
          average_24h: number;
          best_price: number;
          export_tax: number;
          fee: number;
          good_code: string;
          offers: number;
          tariff: number;
          vat: number;
        }[];
      };
      ministry_buy: {
        Args: { p_key: string; p_offer_id: number; p_quantity: number };
        Returns: number;
      };
      ministry_pay: {
        Args: {
          p_amount: number;
          p_citizen_name?: string;
          p_company_id?: number;
          p_concept: string;
          p_currency: string;
          p_key: string;
        };
        Returns: number;
      };
      move_goods: {
        Args: {
          p_company_id: number;
          p_good_code: string;
          p_quantity: number;
          p_to_inventory: boolean;
        };
        Returns: undefined;
      };
      post_offer: {
        Args: {
          p_company_id?: number;
          p_good_code: string;
          p_key: string;
          p_market_country_code: string;
          p_origin_country_code?: string;
          p_price: number;
          p_quantity: number;
        };
        Returns: number;
      };
      propose_bill: {
        Args: { p_body: string; p_key: string; p_kind: string; p_terms: Json; p_title: string };
        Returns: number;
      };
      propose_impeachment: { Args: Record<PropertyKey, never>; Returns: number };
      propose_removal: { Args: { p_office: string }; Returns: number };
      register_candidacy: { Args: Record<PropertyKey, never>; Returns: number };
      register_party_list: { Args: { p_names: string[] }; Returns: number };
      register_ticket: { Args: { p_president: string; p_vice_president: string }; Returns: number };
      request_citizenship: {
        Args: { p_country_code: string };
        Returns: {
          request_id: number;
          status: string;
        }[];
      };
      request_resignation: { Args: Record<PropertyKey, never>; Returns: number };
      resign_office: { Args: Record<PropertyKey, never>; Returns: string };
      run_job: { Args: { p_at?: string; p_job: string }; Returns: Json };
      set_company_offer: {
        Args: { p_company_id: number; p_vacancies: number; p_wage: number };
        Returns: undefined;
      };
      take_job: { Args: { p_company_id: number }; Returns: undefined };
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
      upgrade_company: { Args: { p_company_id: number; p_key: string }; Returns: number };
      use_kit: {
        Args: { p_good_code: string; p_key: string };
        Returns: {
          healed: number;
          health: number;
        }[];
      };
      vote: { Args: { p_candidacy_id: number }; Returns: undefined };
      vote_bill: { Args: { p_bill_id: number; p_choice: string }; Returns: undefined };
      vote_motion: { Args: { p_choice: string; p_motion_id: number }; Returns: undefined };
      withdraw_candidacy: { Args: Record<PropertyKey, never>; Returns: undefined };
      withdraw_from_company: {
        Args: { p_amount: number; p_company_id: number; p_key: string };
        Returns: number;
      };
      withdraw_offer: { Args: { p_offer_id: number }; Returns: undefined };
      withdraw_party_candidacy: { Args: { p_kind: string }; Returns: undefined };
      work: {
        Args: { p_company_id?: number; p_key: string };
        Returns: {
          energy: number;
          good_code: string;
          gross: number;
          kind: string;
          net: number;
          produced: number;
          tax: number;
        }[];
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
