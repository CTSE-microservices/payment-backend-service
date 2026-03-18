export const responseFormatter = (data: any, message = 'Success') => {
  return {
    message,
    data
  };
};
