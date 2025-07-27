export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          default_budget_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          default_budget_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          default_budget_id?: string | null;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          available_amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          available_amount?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          available_amount?: number;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      envelopes: {
        Row: {
          id: string;
          budget_id: string;
          name: string;
          description: string | null;
          current_balance: number;
          target_amount: number | null;
          envelope_type: 'regular' | 'debt' | 'savings';
          category_id: string | null;
          notify_on_low_balance: boolean;
          low_balance_threshold: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          name: string;
          description?: string | null;
          current_balance?: number;
          target_amount?: number | null;
          envelope_type?: 'regular' | 'debt' | 'savings';
          category_id?: string | null;
          notify_on_low_balance?: boolean;
          low_balance_threshold?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          current_balance?: number;
          target_amount?: number | null;
          envelope_type?: 'regular' | 'debt' | 'savings';
          category_id?: string | null;
          notify_on_low_balance?: boolean;
          low_balance_threshold?: number | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          budget_id: string;
          transaction_type: 'income' | 'expense' | 'transfer' | 'allocation' | 'debt_payment';
          amount: number;
          description: string | null;
          transaction_date: string;
          from_envelope_id: string | null;
          to_envelope_id: string | null;
          payee_id: string | null;
          income_source_id: string | null;
          category_id: string | null;
          is_cleared: boolean;
          is_reconciled: boolean;
          created_at: string;
          updated_at: string;
          is_deleted: boolean;
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          budget_id: string;
          transaction_type: 'income' | 'expense' | 'transfer' | 'allocation' | 'debt_payment';
          amount: number;
          description?: string | null;
          transaction_date: string;
          from_envelope_id?: string | null;
          to_envelope_id?: string | null;
          payee_id?: string | null;
          income_source_id?: string | null;
          category_id?: string | null;
          is_cleared?: boolean;
          is_reconciled?: boolean;
          created_at?: string;
          updated_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          transaction_type?: 'income' | 'expense' | 'transfer' | 'allocation' | 'debt_payment';
          amount?: number;
          description?: string | null;
          transaction_date?: string;
          from_envelope_id?: string | null;
          to_envelope_id?: string | null;
          payee_id?: string | null;
          income_source_id?: string | null;
          category_id?: string | null;
          is_cleared?: boolean;
          is_reconciled?: boolean;
          updated_at?: string;
          is_deleted?: boolean;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
      };
      income_sources: {
        Row: {
          id: string;
          budget_id: string;
          name: string;
          description: string | null;
          expected_amount: number | null;
          frequency_days: number | null;
          next_expected_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          name: string;
          description?: string | null;
          expected_amount?: number | null;
          frequency_days?: number | null;
          next_expected_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          expected_amount?: number | null;
          frequency_days?: number | null;
          next_expected_date?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      payees: {
        Row: {
          id: string;
          budget_id: string;
          name: string;
          description: string | null;
          total_paid: number;
          last_payment_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          name: string;
          description?: string | null;
          total_paid?: number;
          last_payment_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          total_paid?: number;
          last_payment_date?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          budget_id: string;
          name: string;
          description: string | null;
          category_type: 'income' | 'expense' | 'transfer' | 'debt_payment';
          parent_category_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          name: string;
          description?: string | null;
          category_type: 'income' | 'expense' | 'transfer' | 'debt_payment';
          parent_category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          category_type?: 'income' | 'expense' | 'transfer' | 'debt_payment';
          parent_category_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}