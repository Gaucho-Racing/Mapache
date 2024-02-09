function getAxiosErrorCode(error: any) {
  if (error.response == null) {
    return 0;
  }
  return error.response.status;
}

function getAxiosErrorMessage(error: any) {
  if (error.response == null) {
    return error.message;
  } else if (error.response.data.message != null) {
    return error.response.data.message;
  } else {
    return "Failed with status code " + error.response.status;
  }
}

export { getAxiosErrorCode, getAxiosErrorMessage };
