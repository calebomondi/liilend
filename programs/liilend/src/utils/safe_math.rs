use crate::errors::LiiLendError;
use std::result::Result as StdResult;

pub trait SafeMath: Sized {
    fn safe_add(self, other: Self) -> StdResult<Self, LiiLendError>;
    fn safe_sub(self, other: Self) -> StdResult<Self, LiiLendError>;
    fn safe_mul(self, other: Self) -> StdResult<Self, LiiLendError>;
    fn safe_div(self, other: Self) -> StdResult<Self, LiiLendError>;
}

macro_rules! impl_safe_math {
    ($($ty:ty),*) => {
        $(
            impl SafeMath for $ty {
                fn safe_add(self, other: Self) -> StdResult<Self, LiiLendError> {
                    self.checked_add(other).ok_or(LiiLendError::MathOverflow)
                }

                fn safe_sub(self, other: Self) -> StdResult<Self, LiiLendError> {
                    self.checked_sub(other).ok_or(LiiLendError::MathOverflow)
                }

                fn safe_mul(self, other: Self) -> StdResult<Self, LiiLendError> {
                    self.checked_mul(other).ok_or(LiiLendError::MathOverflow)
                }

                fn safe_div(self, other: Self) -> StdResult<Self, LiiLendError> {
                    self.checked_div(other).ok_or(LiiLendError::MathOverflow)
                }
            }
        )*
    };
}

impl_safe_math!(u64, u128, i64, u32);
