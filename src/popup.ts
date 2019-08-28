const changeColor = document.getElementById('changeColor');

interface EventTargetWithValue extends EventTarget {
  value: string;
}

if (changeColor) {
  chrome.storage.sync.get('color', data => {
    changeColor.style.backgroundColor = data.color;
    changeColor.setAttribute('value', data.color);
  });

  changeColor.onclick = element => {
    const target = element && (element.target as EventTargetWithValue);
    const color = target.value;
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.tabs.executeScript(tabs[0].id || 0, {
        code: `document.getElementsByClassName("Header")[0].style.backgroundColor = "${color}";`,
      });
    });
  };
} else {
  console.log("Can't find changeColor element");
}
