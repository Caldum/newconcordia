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
      admin_start_independence_war: {
        Args: { p_country_code: string; p_damage_target: number };
        Returns: number;
      };
      am_i_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      appoint_governor: { Args: { p_name: string }; Returns: undefined };
      appoint_minister: { Args: { p_ministry: string; p_name: string }; Returns: undefined };
      attack: {
        Args: { p_battle_id: number; p_key: string; p_side: string };
        Returns: {
          civil_xp: number;
          damage: number;
          energy: number;
          health: number;
          health_lost: number;
          military_xp: number;
          weapon_uses_left: number;
        }[];
      };
      authorize_cb_transfer: {
        Args: { p_amount: number; p_company_name: string; p_currency: string };
        Returns: number;
      };
      authorize_second_shift: {
        Args: { p_company_id: number; p_employee_name: string; p_wage?: number };
        Returns: undefined;
      };
      battle_ranking: {
        Args: { p_battle_id: number };
        Returns: {
          attacks: number;
          damage: number;
          name: string;
          side: string;
        }[];
      };
      break_motion_tie: { Args: { p_choice: string; p_motion_id: number }; Returns: undefined };
      break_tie: { Args: { p_bill_id: number; p_choice: string }; Returns: undefined };
      build_hospital: { Args: { p_key: string; p_region_code: string }; Returns: undefined };
      buy: {
        Args: { p_company_id?: number; p_key: string; p_offer_id: number; p_quantity: number };
        Returns: number;
      };
      buy_market_license: {
        Args: { p_key: string; p_market_country_code: string };
        Returns: number;
      };
      cancel_cb_authorization: { Args: { p_authorization_id: number }; Returns: undefined };
      cancel_citizenship_request: { Args: Record<PropertyKey, never>; Returns: undefined };
      cancel_war_authorization: { Args: { p_authorization_id: number }; Returns: undefined };
      central_bank_to_treasury: {
        Args: { p_amount: number; p_currency: string; p_key: string };
        Returns: number;
      };
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
      equip_weapon: { Args: { p_good_code: string }; Returns: number };
      execute_cb_transfer: { Args: { p_authorization_id: number }; Returns: number };
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
      fx_book: {
        Args: { p_currency: string };
        Returns: {
          gold_amount: number;
          is_central_bank: boolean;
          mine: boolean;
          offer_id: number;
          owner_name: string;
          price: number;
          side: string;
        }[];
      };
      fx_cancel: { Args: { p_offer_id: number }; Returns: undefined };
      fx_post_offer: {
        Args: {
          p_central_bank?: boolean;
          p_currency: string;
          p_gold_amount: number;
          p_key: string;
          p_price: number;
          p_side: string;
        };
        Returns: number;
      };
      fx_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          best_buy: number;
          best_sell: number;
          currency_code: string;
          last_price: number;
          volume_24h: number;
        }[];
      };
      fx_take: {
        Args: {
          p_central_bank?: boolean;
          p_gold_amount: number;
          p_key: string;
          p_offer_id: number;
        };
        Returns: number;
      };
      get_battle: {
        Args: { p_battle_id: number };
        Returns: {
          attacker_country_code: string;
          attacker_damage: number;
          attacker_rounds: number;
          battle_id: number;
          current_round: number;
          defender_country_code: string;
          defender_damage: number;
          defender_rounds: number;
          finished_at: string;
          kind: string;
          my_side_order: boolean;
          region_code: string;
          round_ends_at: string;
          started_at: string;
          status: string;
          winner: string;
        }[];
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
      get_care_policy: {
        Args: { p_country_code: string };
        Returns: {
          policy: string;
          set_at: string;
          set_by_name: string;
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
      get_enemy: {
        Args: { p_country_code: string };
        Returns: {
          enemy_country_code: string;
          since: string;
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
      get_hospital_stock: {
        Args: Record<PropertyKey, never>;
        Returns: {
          good_code: string;
          quantity: number;
          region_code: string;
        }[];
      };
      get_independence_war: {
        Args: { p_country_code: string };
        Returns: {
          damage_target: number;
          damage_total: number;
          ends_at: string;
          hero_name: string;
          started_at: string;
          status: string;
          war_id: number;
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
      get_my_hospital: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_code: string;
          eligible: boolean;
          level: number;
          policy: string;
          region_code: string;
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
      get_my_training: {
        Args: Record<PropertyKey, never>;
        Returns: {
          energy: number;
          fee: number;
          injury_chance: number;
          kind: string;
          level: number;
          strength: number;
          trained_today: boolean;
          upgrade_cost: number;
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
      get_my_weapon: {
        Args: Record<PropertyKey, never>;
        Returns: {
          good_code: string;
          uses_left: number;
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
      get_travel_terms: {
        Args: Record<PropertyKey, never>;
        Returns: {
          enabled: boolean;
          price: number;
        }[];
      };
      hospital_treatment: {
        Args: { p_key: string };
        Returns: {
          good_code: string;
          healed: number;
          health: number;
        }[];
      };
      independence_attack: {
        Args: { p_key: string; p_war_id: number };
        Returns: {
          damage: number;
          energy: number;
          health: number;
          health_lost: number;
          military_xp: number;
          war_status: string;
        }[];
      };
      independence_ranking: {
        Args: { p_war_id: number };
        Returns: {
          attacks: number;
          damage: number;
          name: string;
        }[];
      };
      issue_decree: { Args: { p_body: string; p_key: string; p_title: string }; Returns: number };
      join_party: { Args: { p_party_id: number }; Returns: undefined };
      join_resistance: {
        Args: { p_key: string; p_region_code: string };
        Returns: {
          battle_id: number;
          organizers: number;
        }[];
      };
      join_waitlist: { Args: { p_country_code: string }; Returns: undefined };
      launch_offensive: { Args: { p_key: string; p_region_code: string }; Returns: number };
      leave_job: { Args: Record<PropertyKey, never>; Returns: undefined };
      leave_party: { Args: Record<PropertyKey, never>; Returns: undefined };
      leave_waitlist: { Args: Record<PropertyKey, never>; Returns: undefined };
      list_battle_rounds: {
        Args: { p_battle_id: number };
        Returns: {
          attacker_damage: number;
          defender_damage: number;
          round_no: number;
          winner: string;
        }[];
      };
      list_battles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          attacker_country_code: string;
          attacker_rounds: number;
          battle_id: number;
          current_round: number;
          defender_country_code: string;
          defender_rounds: number;
          finished_at: string;
          kind: string;
          region_code: string;
          started_at: string;
          status: string;
          winner: string;
        }[];
      };
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
      list_care_policy_changes: {
        Args: { p_country_code: string };
        Returns: {
          policy: string;
          set_at: string;
          set_by_name: string;
        }[];
      };
      list_cb_authorizations: {
        Args: { p_country_code: string };
        Returns: {
          amount: number;
          authorization_id: number;
          authorized_by_name: string;
          closed_at: string;
          company_id: number;
          company_name: string;
          created_at: string;
          currency_code: string;
          executed_by_name: string;
          status: string;
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
      list_foreign_relations: {
        Args: { p_country_code: string };
        Returns: {
          detail: string;
          other_country_code: string;
          ours: boolean;
          relation: string;
          since: string;
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
      list_hospitals: {
        Args: { p_country_code: string };
        Returns: {
          built_at: string;
          level: number;
          region_code: string;
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
      list_launch_targets: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_code: string;
          needs_authorization: boolean;
          region_code: string;
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
      list_my_fx_offers: {
        Args: { p_central_bank?: boolean };
        Returns: {
          created_at: string;
          currency_code: string;
          gold_amount: number;
          initial_gold_amount: number;
          offer_id: number;
          price: number;
          side: string;
          status: string;
        }[];
      };
      list_my_injuries: {
        Args: Record<PropertyKey, never>;
        Returns: {
          cause: string;
          created_at: string;
          health_after: number;
          health_lost: number;
          reference: string;
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
      list_my_titles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          country_code: string;
          granted_at: string;
          title: string;
        }[];
      };
      list_occupied_regions: {
        Args: Record<PropertyKey, never>;
        Returns: {
          battle_id: number;
          i_organize: boolean;
          needed: number;
          occupier_country_code: string;
          organizers: number;
          region_code: string;
          restore_country_code: string;
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
      list_war_authorizations: {
        Args: { p_country_code: string };
        Returns: {
          approved_at: string;
          authorization_id: number;
          closed_at: string;
          expires_at: string;
          status: string;
          target_country_code: string;
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
      move_kits: {
        Args: {
          p_from_region?: string;
          p_good_code: string;
          p_quantity: number;
          p_to_region?: string;
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
      set_battle_order: { Args: { p_battle_id: number }; Returns: undefined };
      set_care_policy: { Args: { p_policy: string }; Returns: undefined };
      set_company_offer: {
        Args: { p_company_id: number; p_vacancies: number; p_wage: number };
        Returns: undefined;
      };
      take_job: { Args: { p_company_id: number }; Returns: undefined };
      train: {
        Args: { p_kind: string };
        Returns: {
          energy: number;
          health: number;
          health_lost: number;
          strength_gained: number;
          xp_gained: number;
        }[];
      };
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
      travel: { Args: { p_key: string; p_region_code: string }; Returns: string };
      upgrade_company: { Args: { p_company_id: number; p_key: string }; Returns: number };
      upgrade_hospital: { Args: { p_key: string; p_region_code: string }; Returns: number };
      upgrade_training_center: { Args: { p_key: string; p_kind: string }; Returns: number };
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
